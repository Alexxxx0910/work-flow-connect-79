
import React from 'react';
import MainLayout from './Layout/MainLayout';

interface ShellProps {
  children: React.ReactNode;
}

export const Shell: React.FC<ShellProps> = ({ children }) => {
  return <MainLayout>{children}</MainLayout>;
};
