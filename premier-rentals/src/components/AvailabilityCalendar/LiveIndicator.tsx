import { motion } from "framer-motion";
import { Radio } from "lucide-react";

interface LiveIndicatorProps {
  live: boolean;
}

export default function LiveIndicator({ live }: LiveIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={live ? { scale: [1, 1.2, 1] } : {}}
        transition={{
          duration: 2,
          repeat: live ? Infinity : 0,
          ease: "easeInOut",
        }}
      >
        <Radio
          size={12}
          color={live ? "#d4a853" : "#8a7f6e"}
          fill={live ? "#d4a853" : "none"}
        />
      </motion.div>
      <span
        className={`text-xs uppercase tracking-[0.16em] ${
          live ? "text-premier-gold" : "text-premier-muted"
        }`}
        style={{ fontFamily: "var(--font-ui)" }}
      >
        {live ? "Live" : "Offline"}
      </span>
    </div>
  );
}
