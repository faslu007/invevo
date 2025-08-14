import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type LogoBrandProps = {
  size?: 'small' | 'medium' | 'large';
  showTagline?: boolean;
  color?: string;
};

export const LogoBrand: React.FC<LogoBrandProps> = ({ 
  size = 'medium', 
  showTagline = true,
  color
}) => {
  // Determine logo size based on prop
  let logoSize: number;
  if (size === 'small') logoSize = 24;
  else if (size === 'medium') logoSize = 36;
  else logoSize = 48;
  
  // Determine tagline size based on prop
  let taglineSize: number;
  if (size === 'small') taglineSize = 12;
  else if (size === 'medium') taglineSize = 14;
  else taglineSize = 16;
  
  // Use MUI primary color for the logo to match the new theme
  const textColor = color || '#1976d2';

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={[styles.logoFirstPart, { fontSize: logoSize, color: textColor, letterSpacing: 1.2 }]}> 
          in<Text style={[styles.logoSecondPart, { fontSize: logoSize, color: textColor, fontWeight: '400', letterSpacing: 0.2 }]}>vevo</Text>
        </Text>
      </View>
      
      {showTagline && (
        <Text style={[
          styles.tagline, 
          { fontSize: taglineSize, color: '#1976d2', opacity: 0.85, fontWeight: '500', letterSpacing: 0.1 }
        ]}>
          From Inventory to Invoice
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoFirstPart: {
    fontWeight: 'bold',
  },
  logoSecondPart: {
    fontWeight: '300',
  },
  tagline: {
    marginTop: 5,
    fontStyle: 'italic',
  },
});
