import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd';
import '@/styles/globals.css';
import { Providers } from './providers';
import { antdTheme } from '@/lib/antd-theme';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ScheduleX - Smart Timetable Management by Trixno',
  description: 'ScheduleX is a smart timetable management solution for schools. Generate conflict-free timetables, manage substitutions, and export schedules with ease. A product by Trixno Technology.',
  keywords: ['timetable', 'school management', 'schedule', 'trixno', 'schedulex'],
  authors: [{ name: 'Trixno Technology Private Limited', url: 'https://trixno.com' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AntdRegistry>
          <ConfigProvider theme={antdTheme}>
            <Providers>{children}</Providers>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
