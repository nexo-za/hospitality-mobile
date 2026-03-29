import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';

interface TipSelectorProps {
  subtotal: number;
  onTipChange: (tipAmount: number) => void;
  selectedTip: number;
}

const TIP_PRESETS = [
  { label: '10%', rate: 0.1 },
  { label: '15%', rate: 0.15 },
  { label: '18%', rate: 0.18 },
  { label: '20%', rate: 0.2 },
] as const;

export default function TipSelector({
  subtotal,
  onTipChange,
  selectedTip,
}: TipSelectorProps) {
  const [isCustom, setIsCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const presetAmounts = TIP_PRESETS.map((p) => ({
    ...p,
    amount: Math.round(subtotal * p.rate * 100) / 100,
  }));

  const activePreset = presetAmounts.find(
    (p) => Math.abs(p.amount - selectedTip) < 0.01
  );

  const handlePreset = (amount: number) => {
    setIsCustom(false);
    setCustomValue('');
    onTipChange(amount);
  };

  const handleNoTip = () => {
    setIsCustom(false);
    setCustomValue('');
    onTipChange(0);
  };

  const handleCustomToggle = () => {
    setIsCustom(true);
    setCustomValue(selectedTip > 0 ? selectedTip.toFixed(2) : '');
  };

  const handleCustomSubmit = () => {
    const parsed = parseFloat(customValue);
    onTipChange(isNaN(parsed) || parsed < 0 ? 0 : Math.round(parsed * 100) / 100);
  };

  return (
    <View style={tw`bg-white rounded-xl px-4 py-4 mt-3`}>
      <Text style={[tw`text-sm text-gray-500 mb-3`, typography.captionSemibold]}>
        TIP
      </Text>

      <View style={tw`flex-row flex-wrap gap-2`}>
        <TouchableOpacity
          style={tw`px-4 py-2 rounded-lg border ${
            selectedTip === 0 && !isCustom
              ? 'bg-blue-500 border-blue-500'
              : 'bg-white border-gray-200'
          }`}
          onPress={handleNoTip}
        >
          <Text
            style={[
              tw`text-sm ${selectedTip === 0 && !isCustom ? 'text-white' : 'text-gray-700'}`,
              typography.captionSemibold,
            ]}
          >
            No Tip
          </Text>
        </TouchableOpacity>

        {presetAmounts.map((preset) => {
          const isActive =
            !isCustom && activePreset?.rate === preset.rate && selectedTip > 0;
          return (
            <TouchableOpacity
              key={preset.label}
              style={tw`px-4 py-2 rounded-lg border ${
                isActive
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-white border-gray-200'
              }`}
              onPress={() => handlePreset(preset.amount)}
            >
              <Text
                style={[
                  tw`text-sm ${isActive ? 'text-white' : 'text-gray-700'}`,
                  typography.captionSemibold,
                ]}
              >
                {preset.label}
              </Text>
              <Text
                style={[
                  tw`text-xs ${isActive ? 'text-blue-100' : 'text-gray-400'}`,
                  typography.small,
                ]}
              >
                R{preset.amount.toFixed(2)}
              </Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={tw`px-4 py-2 rounded-lg border ${
            isCustom ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-200'
          }`}
          onPress={handleCustomToggle}
        >
          <Text
            style={[
              tw`text-sm ${isCustom ? 'text-white' : 'text-gray-700'}`,
              typography.captionSemibold,
            ]}
          >
            Custom
          </Text>
        </TouchableOpacity>
      </View>

      {isCustom && (
        <View style={tw`flex-row items-center mt-3 border border-gray-200 rounded-lg px-3`}>
          <Text style={[tw`text-base text-gray-400 mr-1`, typography.body]}>R</Text>
          <TextInput
            style={[tw`flex-1 py-2.5 text-base`, typography.body]}
            value={customValue}
            onChangeText={setCustomValue}
            onEndEditing={handleCustomSubmit}
            onSubmitEditing={handleCustomSubmit}
            keyboardType="decimal-pad"
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
          />
        </View>
      )}

      {selectedTip > 0 && (
        <View style={tw`mt-3 pt-3 border-t border-gray-100 flex-row justify-between`}>
          <Text style={[tw`text-gray-500`, typography.caption]}>Tip amount</Text>
          <Text style={[tw`text-blue-600`, typography.captionSemibold]}>
            R{selectedTip.toFixed(2)}
          </Text>
        </View>
      )}
    </View>
  );
}
