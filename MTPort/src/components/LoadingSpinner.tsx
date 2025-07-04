import React from 'react';
import { Spinner, Text, makeStyles, tokens } from '@fluentui/react-components';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: tokens.spacingVerticalM,
  },
  message: {
    textAlign: 'center',
    color: tokens.colorNeutralForeground2,
  },
});

interface LoadingSpinnerProps {
  message?: string;
  size?: 'tiny' | 'extra-small' | 'small' | 'medium' | 'large' | 'extra-large';
}

export function LoadingSpinner({ message = 'Loading...', size = 'large' }: LoadingSpinnerProps) {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Spinner size={size} />
      <Text className={styles.message}>{message}</Text>
    </div>
  );
} 