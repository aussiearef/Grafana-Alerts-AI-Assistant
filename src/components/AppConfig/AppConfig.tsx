import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, PluginConfigPageProps, AppPluginMeta } from '@grafana/data';
import { FieldSet, useStyles2 } from '@grafana/ui';

type AppPluginSettings = {};

export interface AppConfigProps extends PluginConfigPageProps<AppPluginMeta<AppPluginSettings>> {}

const AppConfig = ({ plugin }: AppConfigProps) => {
  const s = useStyles2(getStyles);
  const { enabled: _enabled, pinned: _pinned } = plugin.meta;

  return (
    <FieldSet label="Plugin Configuration">
      <div className={s.message}>
        This plugin uses Grafana&rsquo;s internal APIs and LLM plugin for functionality. No additional configuration is
        required.
      </div>
    </FieldSet>
  );
};

export default AppConfig;

const getStyles = (theme: GrafanaTheme2) => ({
  message: css`
    margin-top: ${theme.spacing(2)};
    color: ${theme.colors.text.primary};
  `,
});
