/**
 * Logo component - displays Nekuda ACP with gradient text
 */

import React from 'react';
import { Box, Text } from 'ink';
import BigText from 'ink-big-text';
import Gradient from 'ink-gradient';

interface Props {
  compact?: boolean;
}

export const Logo: React.FC<Props> = ({ compact = false }) => {
  if (compact) {
    return (
      <Box marginBottom={1}>
        <Text bold color="cyan">Nekuda ACP Test Runner</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      {/* Nekuda text - bigger font with cyan gradient */}
      <Gradient name="mind">
        <BigText text="NEKUDA" font="block" />
        <BigText text="ACP TEST RUNNER" font="tiny" />
      </Gradient>
    </Box>
  );
};
