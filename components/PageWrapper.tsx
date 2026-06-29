'use client'

import { motion } from 'framer-motion'

export default function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="p-8 max-w-5xl mx-auto flex flex-col gap-6"
    >
      {children}
    </motion.div>
  )
}