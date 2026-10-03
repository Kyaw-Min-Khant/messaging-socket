import * as reportService from "../services/report_service";
import { asyncHandler } from "../utils/asyncHandler";
import { requireUserId } from "../utils/requireUserId";

export const getMonthlyReportController = asyncHandler(async (req, res) => {
  const report = await reportService.getMonthlyReport(requireUserId(req), req.query.month);
  res.status(200).json({ success: true, data: report });
});

export const exportCsvController = asyncHandler(async (req, res) => {
  const { filename, body } = await reportService.exportCsv(
    requireUserId(req),
    req.query as Record<string, string>,
  );
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  // BOM so Excel opens UTF-8 (e.g. Myanmar text) correctly.
  res.status(200).send("﻿" + body);
});
