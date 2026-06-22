import { HStack, Text } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function AnimatedThinkingLabel({
  label,
  color = '#a1a1aa',
  dotColor = '#a1a1aa',
  fontSize = '12px',
}: {
  label: string;
  color?: string;
  dotColor?: string;
  fontSize?: string;
}) {
  return (
    <HStack spacing={0.5} align="center">
      <Text fontSize={fontSize} color={color} fontWeight="medium" whiteSpace="nowrap">
        {label}
      </Text>
      <HStack as="span" spacing={0.5} align="center">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            animate={{ opacity: [0.18, 1, 0.18] }}
            transition={{
              duration: 1.15,
              repeat: Number.POSITIVE_INFINITY,
              ease: 'easeInOut',
              delay: index * 0.18,
            }}
            style={{
              color: dotColor,
              fontSize,
              lineHeight: 1,
              display: 'inline-block',
              minWidth: '0.18em',
              textAlign: 'center',
            }}
          >
            .
          </motion.span>
        ))}
      </HStack>
    </HStack>
  );
}

export function ThinkingOrbit() {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 4.2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <motion.div
        animate={{ scale: [0.92, 1.08, 0.92], opacity: [0.72, 1, 0.72] }}
        transition={{ duration: 1.6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Sparkles size={15} color="#c7c5ff" />
      </motion.div>
    </motion.div>
  );
}
