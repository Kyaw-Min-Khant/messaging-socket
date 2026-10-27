import crypto from "crypto";
import nodemailer from "nodemailer";
import { redisClient } from "../config/redis";
import User from "../models/User";
import { CustomError, ValidationError } from "./custom_error_service";

const OTP_TTL = 600; // seconds a code stays valid
const RESEND_COOLDOWN = 60;
const MAX_TRIES = 5;

// Any SMTP provider works (Gmail App Password, Brevo, Resend); only env vars change.
const port = Number(process.env.SMTP_PORT || 465);
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const hash = (otp: string) =>
  crypto.createHash("sha256").update(otp).digest("hex");
const keys = (email: string) => {
  const e = email.trim().toLowerCase();
  return { otp: `otp:${e}`, tries: `otp-tries:${e}`, cool: `otp-cool:${e}` };
};

/** Emails a 6-digit sign-up code. Only its hash is kept, in Redis. */
export async function sendRegisterOtp(email: string): Promise<void> {
  if (await User.exists({ email: email.trim().toLowerCase() })) {
    throw new ValidationError("User with this email already exists");
  }
  const k = keys(email);
  const fresh = await redisClient.set(k.cool, "1", {
    NX: true,
    EX: RESEND_COOLDOWN,
  });
  if (!fresh) {
    throw new ValidationError("Please wait a minute before requesting another code");
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  await redisClient.setEx(k.otp, OTP_TTL, hash(otp));
  await redisClient.del(k.tries);
  try {
    await transport.sendMail({
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Your verification code: ${otp}`,
      text: `Your sign-up code is ${otp}. It expires in 10 minutes.\n\nIf you didn't ask for this, ignore this email.`,
    });
  } catch (err) {
    console.error("OTP email failed:", err);
    await redisClient.del([k.otp, k.cool]);
    throw new CustomError("Couldn't send the code. Try again.", 503);
  }
}

/** Throws unless `otp` is the live code for `email`. Leaves it in place; call clearRegisterOtp once used. */
export async function verifyRegisterOtp(email: string, otp: string): Promise<void> {
  const k = keys(email);
  const stored = await redisClient.get(k.otp);
  if (!stored) throw new ValidationError("Code expired. Request a new one");
  if (stored === hash(String(otp).trim())) return;

  const tries = await redisClient.incr(k.tries);
  if (tries === 1) await redisClient.expire(k.tries, OTP_TTL);
  if (tries >= MAX_TRIES) {
    await redisClient.del([k.otp, k.tries]);
    throw new ValidationError("Too many wrong codes. Request a new one");
  }
  throw new ValidationError("Wrong code");
}

export async function clearRegisterOtp(email: string): Promise<void> {
  const k = keys(email);
  await redisClient.del([k.otp, k.tries]);
}
