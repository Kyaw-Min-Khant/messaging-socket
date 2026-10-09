const GRADIENTS = [
  "from-indigo-500 to-violet-600",
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-fuchsia-500 to-purple-600",
  "from-cyan-500 to-blue-600",
];

function gradientFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
}

const SIZES = {
  sm: { box: "w-9 h-9 text-sm", dot: "w-2.5 h-2.5" },
  md: { box: "w-12 h-12 text-base", dot: "w-3 h-3" },
  lg: { box: "w-14 h-14 text-lg", dot: "w-3.5 h-3.5" },
  xl: { box: "w-28 h-28 text-4xl", dot: "w-5 h-5" },
};

/** Round avatar with an image or a colored initial, plus an optional online dot. */
export function Avatar({
  name,
  src,
  size = "md",
  online,
  ringClass = "border-gray-950",
}: {
  name: string;
  src?: string;
  size?: keyof typeof SIZES;
  online?: boolean;
  /** Border color of the online dot; match the background behind the avatar. */
  ringClass?: string;
}) {
  const s = SIZES[size];
  return (
    <div className="relative shrink-0">
      <div
        className={`${s.box} rounded-full bg-gradient-to-br ${gradientFor(name)} flex items-center justify-center text-white font-semibold overflow-hidden`}
      >
        {src ? <img src={src} alt={name} className="w-full h-full object-cover" /> : name.charAt(0).toUpperCase()}
      </div>
      {online && (
        <span className={`absolute bottom-0 right-0 ${s.dot} rounded-full bg-emerald-400 border-2 ${ringClass}`} />
      )}
    </div>
  );
}
