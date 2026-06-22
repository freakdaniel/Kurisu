import { Box, Heading, Text, VStack, Button } from '@chakra-ui/react';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import katsumiHello from '@/assets/stickers/katsumi_hello.png';

interface Step1LandingProps {
  onNext: () => void;
}

export function Step1Landing({ onNext }: Step1LandingProps) {
  const { t } = useTranslation();

  return (
    <VStack spacing={6} align="center" py={6}>
      <Box
        w="180px"
        h="180px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        filter="drop-shadow(0 8px 24px rgba(0, 0, 0, 0.45))"
      >
        <img
          src={katsumiHello}
          alt="Katsumi"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </Box>

      <Heading
        as="h1"
        size="xl"
        color="white"
        fontWeight="semibold"
        letterSpacing="-0.01em"
        textAlign="center"
      >
        {t('welcome.greeting')}
      </Heading>

      <Text
        color="gray.400"
        fontSize="md"
        fontStyle="regular"
        textAlign="center"
        maxW="440px"
        lineHeight="1.6"
      >
        {t('welcome.intro')}
      </Text>

      <Button
        size="lg"
        rightIcon={<ArrowRight size={18} />}
        bg="brand.500"
        color="white"
        _hover={{ bg: 'brand.600' }}
        _active={{ bg: 'brand.700' }}
        h="52px"
        px={10}
        fontSize="md"
        mt={2}
        borderRadius="full"
        onClick={onNext}
      >
        {t('welcome.getStarted')}
      </Button>
    </VStack>
  );
}
