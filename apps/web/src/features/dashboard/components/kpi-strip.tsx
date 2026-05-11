"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/shared/ui/card";

export function KpiStrip({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, duration: 0.25 }}
        >
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
