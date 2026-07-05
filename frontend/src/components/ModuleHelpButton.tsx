import { QuestionCircleOutlined } from '@ant-design/icons';
import { Button, Drawer, Typography } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const SECTION_KEYS = ['purpose', 'legalBasis', 'whoWorksHere', 'workflow', 'bestPractices', 'commonMistakes'] as const;

interface ModuleHelpButtonProps {
  moduleKey: string;
}

export function ModuleHelpButton({ moduleKey }: ModuleHelpButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        shape="circle"
        icon={<QuestionCircleOutlined />}
        onClick={() => setOpen(true)}
        aria-label={t('help.buttonLabel')}
        title={t('help.buttonLabel')}
      />
      <Drawer title={t(`help.modules.${moduleKey}.title`)} open={open} onClose={() => setOpen(false)} width={420}>
        {SECTION_KEYS.map((sectionKey) => (
          <div key={sectionKey} style={{ marginBottom: 20 }}>
            <Typography.Title level={5} style={{ marginTop: 0 }}>
              {t(`help.sectionLabels.${sectionKey}`)}
            </Typography.Title>
            <Typography.Paragraph style={{ whiteSpace: 'pre-line' }}>
              {t(`help.modules.${moduleKey}.${sectionKey}`)}
            </Typography.Paragraph>
          </div>
        ))}
      </Drawer>
    </>
  );
}
