import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 6,
  },
  components: {
    Button: {
      controlHeight: 36,
    },
    Input: {
      controlHeight: 36,
    },
    Select: {
      controlHeight: 36,
    },
  },
};
