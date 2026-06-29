'use client'

import { motion } from 'framer-motion'

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export function AnimatedCard({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      variants={cardVariants}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function AnimatedContainer({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.1 } }
      }}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  )
}