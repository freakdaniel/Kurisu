import {
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  Text,
  VStack,
} from '@chakra-ui/react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adwaitaColors } from '@/lib/themeTokens';

export interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  version: string;
  description: string;
}

/**
 * "About" dialog. Invoked from the topbar application menu. Modelled on
 * libadwaita's <c>Adw.AboutWindow</c> / <c>Adw.AboutDialog</c>: a flat rounded
 * surface, generous padding, a bold heading, a subdued version line and a
 * single suggested (filled accent) action. Dismissible via the inline close
 * affordance, the Escape key, or a backdrop click.
 */
export function AboutDialog({ open, onClose, productName, version, description }: AboutDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <Modal isOpen={open} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(6px)" bg="rgba(0,0,0,0.45)" />
      <ModalContent
        bg={adwaitaColors.dialogBg}
        color={adwaitaColors.fg}
        border="1px solid"
        borderColor={adwaitaColors.borderStrong}
        borderRadius="12px"
        boxShadow="0 1px 2px rgba(0, 0, 0, 0.3), 0 24px 32px -8px rgba(0, 0, 0, 0.36)"
        overflow="hidden"
      >
        <ModalCloseButton
          top={3}
          right={3}
          size="sm"
          color={adwaitaColors.fgSecondary}
          borderRadius="8px"
          _hover={{ bg: 'rgba(255,255,255,0.08)', color: adwaitaColors.fg }}
        />
        <ModalBody px={6} pt={7} pb={2}>
          <VStack align="stretch" spacing={4}>
            <VStack align="start" spacing={1.5}>
              <Text fontSize="22px" fontWeight={700} lineHeight={1.2} letterSpacing="-0.01em">
                {productName}
              </Text>
              <HStack spacing={1.5} fontSize="13px">
                <Text color={adwaitaColors.fgMuted}>{t('menu.version')}</Text>
                <Text color={adwaitaColors.fgSecondary} fontWeight={500}>
                  {version}
                </Text>
              </HStack>
            </VStack>
            <Text fontSize="14px" color={adwaitaColors.fgSecondary} lineHeight={1.5}>
              {description}
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter px={6} pt={3} pb={6}>
          <HStack spacing={2} justify="flex-end" w="100%">
            <Button
              h="34px"
              px={5}
              borderRadius="10px"
              bg={adwaitaColors.accent}
              color="white"
              fontWeight={500}
              fontSize="14px"
              _hover={{ bg: adwaitaColors.accentHover }}
              _active={{ bg: adwaitaColors.accentHover }}
              onClick={onClose}
            >
              {t('menu.close')}
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}