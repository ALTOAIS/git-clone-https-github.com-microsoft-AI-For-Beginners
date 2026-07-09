import {
  ColumnWidthOutlined,
  DownloadOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { Alert, Button, Skeleton, Space, Tooltip, Typography } from 'antd';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface Props {
  /** Blob URL или обычный URL PDF-файла */
  fileUrl: string;
  fileName: string;
  onDownload?: () => void;
  /** Высота области просмотра (по умолчанию 70vh) */
  height?: string;
}

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

export function PdfViewer({ fileUrl, fileName, onDownload, height = '70vh' }: Props) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTokenRef = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState<number | 'fit'>('fit');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const renderAllPages = useCallback(async () => {
    const pdf = pdfRef.current;
    const host = pagesRef.current;
    if (!pdf || !host) return;
    const token = ++renderTokenRef.current;

    let effectiveScale: number;
    if (scale === 'fit') {
      const firstPage = await pdf.getPage(1);
      const baseViewport = firstPage.getViewport({ scale: 1 });
      const available = host.clientWidth - 32;
      effectiveScale = available > 0 ? available / baseViewport.width : 1;
    } else {
      effectiveScale = scale;
    }

    const fragment = document.createDocumentFragment();
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      if (renderTokenRef.current !== token) return;
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: effectiveScale });
      const outputScale = window.devicePixelRatio || 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto 12px';
      canvas.style.boxShadow = '0 1px 4px rgba(0,0,0,0.25)';
      const context = canvas.getContext('2d');
      if (!context) continue;
      await page.render({
        canvasContext: context,
        viewport,
        transform:
          outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
      }).promise;
      if (renderTokenRef.current !== token) return;
      fragment.appendChild(canvas);
    }
    if (renderTokenRef.current !== token) return;
    host.replaceChildren(fragment);
  }, [scale]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const loadingTask = pdfjsLib.getDocument({ url: fileUrl });
    loadingTask.promise
      .then((pdf) => {
        if (cancelled) return;
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      void loadingTask.destroy();
    };
  }, [fileUrl]);

  useEffect(() => {
    if (!loading && !error) void renderAllPages();
  }, [loading, error, renderAllPages]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const zoom = (direction: 1 | -1) => {
    setScale((current) => {
      const numeric =
        current === 'fit'
          ? (pagesRef.current?.querySelector('canvas')?.clientWidth ?? 800) /
            ((pagesRef.current?.clientWidth ?? 832) - 32)
          : current;
      const index = ZOOM_STEPS.findIndex((step) => step >= numeric - 0.01);
      const nextIndex = Math.min(
        Math.max((index === -1 ? 2 : index) + direction, 0),
        ZOOM_STEPS.length - 1,
      );
      return ZOOM_STEPS[nextIndex];
    });
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  };

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message={t('pdfViewer.errorTitle')}
        description={t('pdfViewer.errorDescription')}
        action={
          onDownload && (
            <Button size="small" icon={<DownloadOutlined />} onClick={onDownload}>
              {t('pdfViewer.download')}
            </Button>
          )
        }
      />
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: 8,
        overflow: 'hidden',
        background: isFullscreen ? '#525659' : undefined,
        display: 'flex',
        flexDirection: 'column',
        height: isFullscreen ? '100%' : undefined,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '6px 12px',
          borderBottom: '1px solid #d9d9d9',
          background: '#fafafa',
        }}
      >
        <Typography.Text ellipsis style={{ maxWidth: '45%' }} title={fileName}>
          {fileName}
        </Typography.Text>
        <Space size={4}>
          {pageCount > 0 && (
            <Typography.Text type="secondary" style={{ marginRight: 8 }}>
              {t('pdfViewer.pages', { count: pageCount })}
            </Typography.Text>
          )}
          <Tooltip title={t('pdfViewer.zoomOut')}>
            <Button size="small" icon={<ZoomOutOutlined />} onClick={() => zoom(-1)} />
          </Tooltip>
          <Tooltip title={t('pdfViewer.zoomIn')}>
            <Button size="small" icon={<ZoomInOutlined />} onClick={() => zoom(1)} />
          </Tooltip>
          <Tooltip title={t('pdfViewer.fitWidth')}>
            <Button
              size="small"
              type={scale === 'fit' ? 'primary' : 'default'}
              icon={<ColumnWidthOutlined />}
              onClick={() => setScale('fit')}
            />
          </Tooltip>
          <Tooltip title={isFullscreen ? t('pdfViewer.exitFullscreen') : t('pdfViewer.fullscreen')}>
            <Button
              size="small"
              icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              onClick={toggleFullscreen}
            />
          </Tooltip>
          {onDownload && (
            <Tooltip title={t('pdfViewer.download')}>
              <Button size="small" icon={<DownloadOutlined />} onClick={onDownload} />
            </Tooltip>
          )}
        </Space>
      </div>
      <div
        style={{
          overflow: 'auto',
          padding: 16,
          background: '#525659',
          flex: 1,
          height: isFullscreen ? undefined : height,
        }}
      >
        {loading ? (
          <div style={{ background: '#fff', padding: 24, borderRadius: 4 }}>
            <Skeleton active paragraph={{ rows: 12 }} />
          </div>
        ) : (
          <div ref={pagesRef} />
        )}
      </div>
    </div>
  );
}
