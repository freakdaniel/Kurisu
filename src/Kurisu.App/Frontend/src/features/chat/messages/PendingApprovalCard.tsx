import { Box, Button, HStack, IconButton, Input, Text } from '@chakra-ui/react';
import { ArrowUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { DesktopSessionEntry } from '@/types/desktop';
import {
  getPendingApprovalDetailLines,
  getPendingApprovalReason,
} from '@/lib/approvalRules';
import {
  getApprovalAllowOnceLabel,
  getApprovalAlwaysAllowLabel,
  getApprovalCardTitle,
  getApprovalFeedbackLabel,
  getApprovalFeedbackPlaceholder,
} from '@/features/chat/messages/approvalCardHelpers';

const ACCENT = '#615CED';
const ACCENT_HOVER = '#4e49d9';

export function PendingApprovalCard({
  entry,
  feedbackValue,
  onFeedbackChange,
  onAllowOnce,
  onAlwaysAllow,
  onSubmitFeedback,
}: {
  entry: DesktopSessionEntry;
  feedbackValue: string;
  onFeedbackChange: (value: string) => void;
  onAllowOnce: () => void;
  onAlwaysAllow: () => void;
  onSubmitFeedback: () => void;
}) {
  const { t } = useTranslation();
  const reason = getPendingApprovalReason(entry);
  const detailLines = getPendingApprovalDetailLines(entry);

  return (
    <Box maxW="560px" w="full">
      <Box
        border="1px solid"
        borderColor="gray.700"
        bg="rgba(39,39,46,0.94)"
        borderRadius="xl"
        px={3}
        py={2.5}
      >
        <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="0.14em">
          {getApprovalCardTitle(t)}
        </Text>

        {reason && (
          <Text mt={1.5} fontSize="xs" color="gray.300" whiteSpace="pre-wrap" wordBreak="break-word">
            {reason}
          </Text>
        )}

        {detailLines.length > 0 && (
          <Box
            as="pre"
            mt={2}
            mb={0}
            px={2.5}
            py={2}
            bg="gray.900"
            border="1px solid"
            borderColor="gray.700"
            borderRadius="lg"
            color="gray.200"
            fontSize="11px"
            fontFamily="mono"
            overflowX="auto"
            whiteSpace="pre-wrap"
          >
            {detailLines.join('\n')}
          </Box>
        )}
      </Box>

      <HStack mt={2} spacing={2} align="stretch" flexWrap="wrap">
        <Button
          onClick={onAllowOnce}
          bg={ACCENT}
          color="white"
          _hover={{ bg: ACCENT_HOVER }}
          _active={{ bg: ACCENT_HOVER }}
          borderRadius="full"
          h="32px"
          px={3.5}
          fontSize="xs"
          fontWeight="normal"
        >
          {getApprovalAllowOnceLabel(t)}
        </Button>
        <Button
          onClick={onAlwaysAllow}
          bg="white"
          color="gray.900"
          _hover={{ bg: 'gray.100' }}
          _active={{ bg: 'gray.200' }}
          borderRadius="full"
          h="32px"
          px={3.5}
          fontSize="xs"
          fontWeight="normal"
        >
          {getApprovalAlwaysAllowLabel(t)}
        </Button>
        <Input
          value={feedbackValue}
          onChange={(event) => onFeedbackChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmitFeedback();
            }
          }}
          placeholder={getApprovalFeedbackLabel(t)}
          bg="gray.900"
          border="1px solid"
          borderColor="gray.700"
          color="white"
          borderRadius="full"
          h="32px"
          px={3.5}
          fontSize="xs"
          flex="1 1 240px"
          minW="220px"
          _placeholder={{ color: 'gray.500' }}
          _hover={{ borderColor: 'gray.600' }}
          _focusVisible={{ borderColor: 'brand.400', boxShadow: '0 0 0 1px rgba(97,92,237,0.35)' }}
        />
        <IconButton
          aria-label={getApprovalFeedbackPlaceholder(t)}
          icon={<ArrowUp size={15} />}
          onClick={onSubmitFeedback}
          isDisabled={!feedbackValue.trim()}
          bg="gray.800"
          color="white"
          border="1px solid"
          borderColor="gray.700"
          borderRadius="full"
          minW="32px"
          w="32px"
          h="32px"
          _hover={{ bg: 'gray.700' }}
          _active={{ bg: 'gray.700' }}
        />
      </HStack>
    </Box>
  );
}
