import { useCallback, useEffect, useMemo, useRef, useState, Children, isValidElement, type ReactNode } from 'react';
import { Box, Button, HStack, IconButton, Text } from '@chakra-ui/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Highlight } from 'prism-react-renderer';
import Prism from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-diff';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-yaml';
import ReactMarkdown from 'react-markdown';
import 'katex/dist/katex.min.css';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { Check, Copy, Download, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  normalizeMathSegments,
  normalizeUndelimitedMath,
  remarkUndelimitedTableMath,
} from '@/features/chat/markdown/markdownMath';
import {
  buildCsvContent,
  buildExcelContent,
  copyTextToClipboard,
  downloadTextContent,
  extractMarkdownTableRows,
} from '@/features/chat/markdown/tableExport';
import {
  ASSISTANT_MARKDOWN_SX,
  CODE_THEME,
  flattenReactText,
  INLINE_CODE_BACKGROUND,
  INLINE_CODE_COLOR,
  normalizeCodeLanguage,
  SUPPORTED_HIGHLIGHT_LANGUAGES,
} from '@/features/chat/markdown/markdownHelpers';

void SUPPORTED_HIGHLIGHT_LANGUAGES;

export function MarkdownInlineCode({ children }: { children?: ReactNode }) {
  return (
    <Box
      as="code"
      display="inline-flex"
      alignItems="center"
      px="0.38em"
      py="0.14em"
      borderRadius="8px"
      fontFamily="mono"
      fontSize="0.85em"
      lineHeight="1.4"
      color={INLINE_CODE_COLOR}
      bg={INLINE_CODE_BACKGROUND}
      border="1px solid rgba(133,131,246,0.14)"
    >
      {flattenReactText(children)}
    </Box>
  );
}

export function MarkdownCodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const code = flattenReactText(children).replace(/\n$/, '');
  const language = className?.match(/language-([\w-]+)/)?.[1] ?? 'text';
  const highlightLanguage = normalizeCodeLanguage(language);
  const lines = code.split('\n');

  // `code` is derived from `children` and React's compiler can't see that
  // it's effectively a prop snapshot, so the manual memoization is
  // unverifiable. Suppress the rule – the behaviour is correct.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const handleCopy = useCallback(async () => {
    if (!code.trim()) {
      return;
    }

    try {
      await copyTextToClipboard(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (error) {
      console.error('Failed to copy code block:', error);
    }
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
  }, [code]);

  return (
    <Box
      my={4}
      border="1px solid"
      borderColor="rgba(255,255,255,0.08)"
      borderRadius="20px"
      overflow="hidden"
      bg="#24242b"
      boxShadow="0 16px 48px -32px rgba(0,0,0,0.9)"
    >
      <HStack
        justify="space-between"
        align="center"
        px={4}
        py={0}
        h="30px"
        bg="rgba(255,255,255,0.04)"
        borderBottom="1px solid"
        borderColor="rgba(255,255,255,0.06)"
      >
        <Box
          display="flex"
          alignItems="center"
          h="full"
          minW={0}
        >
          <Text
            fontSize="11px"
            fontWeight="semibold"
            fontFamily="mono"
            color="gray.100"
            textTransform="lowercase"
            letterSpacing="0.02em"
            lineHeight="1"
            mb={0}
          >
            {language}
          </Text>
        </Box>
        <IconButton
          aria-label={copied ? t('chat.message.copied') : t('chat.message.copyCode')}
          size="xs"
          variant="ghost"
          color={copied ? '#d8d7ff' : 'gray.300'}
          icon={copied ? <Check size={13} /> : <Copy size={13} />}
          minW="20px"
          w="20px"
          h="20px"
          _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'white' }}
          onClick={() => { void handleCopy(); }}
        />
      </HStack>

      <Box overflowX="auto" bg="#24242b" pt={2} pb={1}>
        {highlightLanguage ? (
          <Highlight prism={Prism} theme={CODE_THEME} code={code} language={highlightLanguage}>
            {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
              <Box
                as="pre"
                className={highlightClassName}
                m={0}
                px={0}
                py={0}
                bg="transparent"
                style={{ ...style, background: 'transparent', margin: 0 }}
              >
                {tokens.map((lineTokens, index) => {
                  const isLastEmptyLine = index === tokens.length - 1 && lineTokens.length === 1 && lineTokens[0]?.empty;
                  if (isLastEmptyLine) {
                    return null;
                  }

                  return (
                    <HStack
                      key={`code-line-${index + 1}`}
                      {...getLineProps({ line: lineTokens })}
                      align="stretch"
                      spacing={0}
                      fontFamily="mono"
                      fontSize="13px"
                      lineHeight="1.9"
                      minW="fit-content"
                      bg="transparent"
                    >
                      <Box
                        w="52px"
                        flexShrink={0}
                        px={4}
                        py={0}
                        textAlign="right"
                        color="gray.500"
                        borderRight="1px solid"
                        borderColor="rgba(255,255,255,0.06)"
                        userSelect="none"
                      >
                        {index + 1}
                      </Box>
                      <Box
                        px={4}
                        py={0}
                        whiteSpace="pre"
                        color="gray.100"
                      >
                        {lineTokens.length > 0
                          ? lineTokens.map((token, tokenIndex) => (
                            <Box
                              as="span"
                              key={`code-token-${index + 1}-${tokenIndex}`}
                              {...getTokenProps({ token })}
                            />
                          ))
                          : ' '}
                      </Box>
                    </HStack>
                  );
                })}
              </Box>
            )}
          </Highlight>
        ) : (
          <Box as="pre" m={0} px={0} py={0} bg="transparent">
            {lines.map((line: string, index: number) => (
              <HStack
                key={`code-line-${index + 1}`}
                align="stretch"
                spacing={0}
                fontFamily="mono"
                fontSize="13px"
                lineHeight="1.9"
                minW="fit-content"
              >
                <Box
                  w="52px"
                  flexShrink={0}
                  px={4}
                  py={0}
                  textAlign="right"
                  color="gray.500"
                  borderRight="1px solid"
                  borderColor="rgba(255,255,255,0.06)"
                  userSelect="none"
                >
                  {index + 1}
                </Box>
                <Box
                  px={4}
                  py={0}
                  whiteSpace="pre"
                  color="gray.100"
                >
                  {line || ' '}
                </Box>
              </HStack>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}

export function MarkdownPre({ children }: { children?: ReactNode }) {
  const firstChild = Children.toArray(children)[0];
  if (!isValidElement(firstChild)) {
    return <>{children}</>;
  }

  const childProps = firstChild.props as { className?: string; children?: ReactNode };
  return (
    <MarkdownCodeBlock className={childProps.className}>
      {childProps.children}
    </MarkdownCodeBlock>
  );
}

export function MarkdownCode({ children }: { children?: ReactNode }) {
  return <MarkdownInlineCode>{children}</MarkdownInlineCode>;
}

export function MarkdownTable({
  node,
  children,
}: {
  node?: unknown;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const rows = useMemo(() => extractMarkdownTableRows(node), [node]);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const exportAsCsv = useCallback(() => {
    if (rows.length === 0) {
      return;
    }

    downloadTextContent(
      `table-${Date.now()}.csv`,
      buildCsvContent(rows),
      'text/csv;charset=utf-8',
    );
    setMenuOpen(false);
  }, [rows]);

  const exportAsExcel = useCallback(() => {
    if (rows.length === 0) {
      return;
    }

    downloadTextContent(
      `table-${Date.now()}.xls`,
      buildExcelContent(rows),
      'application/vnd.ms-excel;charset=utf-8',
    );
    setMenuOpen(false);
  }, [rows]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }

      if (menuRef.current?.contains(target)) {
        return;
      }

      setMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [menuOpen]);

  return (
    <Box my={4} position="relative">
      <Box
        overflowX="auto"
        border="1px solid"
        borderColor="rgba(255,255,255,0.08)"
        borderRadius="20px"
        bg="#24242b"
        boxShadow="0 12px 40px -28px rgba(0,0,0,0.9)"
      >
        <Box as="table" w="full">
          {children}
        </Box>
      </Box>

      <Box
        position="absolute"
        top="24px"
        right={2}
        transform="translateY(-50%)"
        zIndex={1}
        ref={menuRef}
      >
        <IconButton
          aria-label={t('chat.message.exportTable')}
          size="xs"
          variant="ghost"
          icon={<Download size={13} />}
          minW="28px"
          w="28px"
          h="28px"
          color="gray.300"
          _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'white' }}
          onClick={() => setMenuOpen((current) => !current)}
        />

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.96 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                right: 0,
              }}
            >
              <Box
                minW="112px"
                bg="#2f2f37"
                border="1px solid"
                borderColor="rgba(255,255,255,0.08)"
                borderRadius="14px"
                boxShadow="0 18px 42px -26px rgba(0,0,0,0.95)"
                p={1}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  justifyContent="flex-start"
                  w="full"
                  h="30px"
                  px={2.5}
                  borderRadius="10px"
                  color="gray.200"
                  fontWeight="normal"
                  leftIcon={<Download size={12} />}
                  _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'white' }}
                  onClick={exportAsCsv}
                >
                  CSV
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  justifyContent="flex-start"
                  w="full"
                  h="30px"
                  px={2.5}
                  borderRadius="10px"
                  color="gray.200"
                  fontWeight="normal"
                  leftIcon={<FileSpreadsheet size={12} />}
                  _hover={{ bg: 'rgba(255,255,255,0.06)', color: 'white' }}
                  onClick={exportAsExcel}
                >
                  Excel
                </Button>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
    </Box>
  );
}

export function AssistantMarkdownBody({ text }: { text: string }) {
  const normalizedText = useMemo(() => normalizeMathSegments(normalizeUndelimitedMath(text)), [text]);

  return (
    <Box
      color="gray.100"
      fontSize="sm"
      lineHeight="1.75"
      sx={ASSISTANT_MARKDOWN_SX}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkUndelimitedTableMath]}
        rehypePlugins={[[rehypeKatex, { strict: 'ignore', trust: false, errorColor: '#cfcfe6' }]]}
        components={{
          pre: MarkdownPre,
          code: MarkdownCode,
          table: MarkdownTable,
        }}
      >
        {normalizedText}
      </ReactMarkdown>
    </Box>
  );
}

export function StreamingAssistantBody({
  text,
  isStreaming,
}: {
  text: string;
  isStreaming: boolean;
}) {
  return (
    <Box position="relative">
      <AssistantMarkdownBody text={text} />
      {isStreaming && (
        <Box
          as="span"
          display="inline-block"
          ml={1}
          mt={1}
          w="8px"
          h="1.1em"
          borderRadius="999px"
          bg="rgba(255,255,255,0.6)"
          verticalAlign="text-bottom"
          animation="kurisu-streaming-caret 1s ease-in-out infinite"
          sx={{
            '@keyframes kurisu-streaming-caret': {
              '0%, 100%': { opacity: 0.24 },
              '50%': { opacity: 1 },
            },
          }}
        />
      )}
    </Box>
  );
}
