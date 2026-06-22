import type { MutableRefObject } from 'react';
import { Box, Flex, HStack, IconButton, Text, Tooltip } from '@chakra-ui/react';
import { Copy, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { DesktopSessionEntry } from '@/types/desktop';
import { copyTextToClipboard } from '@/features/chat/markdown';

const USER_MESSAGE_BACKGROUND = '#31313a';

function formatMessageDetails(locale: string, t: TFunction, timestamp?: string): string {
  if (!timestamp) {
    return t('chat.message.timeUnavailable');
  }

  try {
    return new Date(timestamp).toLocaleString(locale || undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return timestamp;
  }
}

export interface UserMessageProps {
  entry: DesktopSessionEntry;
  text: string;
  locale: string;
  latestPendingUserEntryId: string;
  animatedUserEntryIdsRef: MutableRefObject<Set<string>>;
}

export function UserMessage({ entry, text, locale, latestPendingUserEntryId, animatedUserEntryIdsRef }: UserMessageProps) {
  const { t } = useTranslation();
  if (!text) {
    return null;
  }

  const shouldAnimateUserMessage =
    entry.id === latestPendingUserEntryId &&
    !animatedUserEntryIdsRef.current.has(entry.id);

  return (
    <Flex key={entry.id} justify="flex-end" py={2.5}>
      <Box position="relative" role="group" maxW="80%" pb="32px">
        <motion.div
          initial={shouldAnimateUserMessage ? { opacity: 0, y: 10, scale: 0.985 } : false}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onAnimationComplete={() => {
            if (shouldAnimateUserMessage) {
              animatedUserEntryIdsRef.current.add(entry.id);
            }
          }}
        >
          <Box
            px={5}
            py={3.5}
            borderRadius="24px"
            bg={USER_MESSAGE_BACKGROUND}
            boxShadow="inset 0 0 0 1px rgba(255,255,255,0.03)"
          >
            <Text color="white" fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word" lineHeight="1.85">
              {text}
            </Text>
          </Box>
        </motion.div>
        <HStack
          position="absolute"
          right={2}
          bottom="0"
          spacing={1}
          opacity={0}
          transform="translateY(-2px)"
          transition="opacity 0.16s ease, transform 0.16s ease"
          _groupHover={{ opacity: 1, transform: 'translateY(0)' }}
        >
          <Tooltip label={t('chat.message.copy')} hasArrow>
            <IconButton
              aria-label={t('chat.message.copyMessage')}
              icon={<Copy size={14} />}
              variant="ghost"
              size="xs"
              color="gray.400"
              borderRadius="10px"
              _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'white' }}
              onClick={() => { void copyTextToClipboard(text); }}
            />
          </Tooltip>
          <Tooltip label={formatMessageDetails(locale, t, entry.timestamp)} hasArrow>
            <IconButton
              aria-label={t('chat.message.info')}
              icon={<Info size={14} />}
              variant="ghost"
              size="xs"
              color="gray.400"
              borderRadius="10px"
              _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'white' }}
            />
          </Tooltip>
        </HStack>
      </Box>
    </Flex>
  );
}
