import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { HospitalityPaymentType } from '@/types/hospitality';

interface TenderSelectorProps {
  amount: number;
  balanceDue: number;
  onSelectTender: (type: HospitalityPaymentType, amount: number) => void;
}

interface TenderOption {
  type: HospitalityPaymentType;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
}

const TENDER_OPTIONS: TenderOption[] = [
  { type: 'CASH', label: 'Cash', icon: 'cash', color: '#16A34A' },
  { type: 'ECENTRIC', label: 'Card', icon: 'credit-card-outline', color: '#2563EB' },
  { type: 'SNAPSCAN', label: 'SnapScan', icon: 'qrcode-scan', color: '#E11D48' },
  { type: 'ZAPPER', label: 'Zapper', icon: 'cellphone-nfc', color: '#7C3AED' },
  { type: 'TAP_TO_PAY', label: 'Tap to Pay', icon: 'contactless-payment', color: '#0891B2' },
  { type: 'VOUCHER', label: 'Voucher', icon: 'ticket-percent-outline', color: '#D97706' },
  { type: 'COMP', label: 'Comp', icon: 'gift-outline', color: '#6B7280' },
];

function roundUp(value: number, nearest: number): number {
  return Math.ceil(value / nearest) * nearest;
}

export default function TenderSelector({
  amount,
  balanceDue,
  onSelectTender,
}: TenderSelectorProps) {
  const [selectedType, setSelectedType] = useState<HospitalityPaymentType | null>(null);
  const [cashInput, setCashInput] = useState('');

  const isFullyCovered = balanceDue <= 0;

  const handleTenderTap = (type: HospitalityPaymentType) => {
    if (type === 'CASH') {
      setSelectedType('CASH');
      setCashInput(amount.toFixed(2));
    } else {
      setSelectedType(null);
      onSelectTender(type, amount);
    }
  };

  const handleCashConfirm = () => {
    const parsed = parseFloat(cashInput);
    if (isNaN(parsed) || parsed <= 0) return;
    onSelectTender('CASH', parsed);
    setSelectedType(null);
    setCashInput('');
  };

  const handleQuickCash = (value: number) => {
    setCashInput(value.toFixed(2));
  };

  const cashTendered = parseFloat(cashInput) || 0;
  const changeDue = cashTendered > amount ? cashTendered - amount : 0;

  const roundUp10 = roundUp(amount, 10);
  const roundUp50 = roundUp(amount, 50);
  const roundUp100 = roundUp(amount, 100);

  return (
    <View style={tw`bg-white rounded-xl px-4 py-4 mt-3`}>
      <View style={tw`flex-row items-center justify-between mb-3`}>
        <Text style={[tw`text-sm text-gray-500`, typography.captionSemibold]}>
          PAYMENT METHOD
        </Text>
        <View
          style={tw`px-2 py-0.5 rounded-full ${
            isFullyCovered ? 'bg-green-100' : 'bg-red-50'
          }`}
        >
          <Text
            style={[
              tw`text-xs ${isFullyCovered ? 'text-green-700' : 'text-red-600'}`,
              typography.captionSemibold,
            ]}
          >
            {isFullyCovered
              ? 'Fully Covered'
              : `Balance: R${balanceDue.toFixed(2)}`}
          </Text>
        </View>
      </View>

      <View style={tw`flex-row flex-wrap gap-3`}>
        {TENDER_OPTIONS.map((opt) => {
          const isActive = selectedType === opt.type;
          return (
            <TouchableOpacity
              key={opt.type}
              style={tw`w-[30%] items-center py-3 rounded-xl border ${
                isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
              }`}
              onPress={() => handleTenderTap(opt.type)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={opt.icon}
                size={28}
                color={isActive ? '#2563EB' : opt.color}
              />
              <Text
                style={[
                  tw`text-xs mt-1 ${isActive ? 'text-blue-600' : 'text-gray-700'}`,
                  typography.captionSemibold,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedType === 'CASH' && (
        <View style={tw`mt-4 pt-4 border-t border-gray-100`}>
          <Text style={[tw`text-sm text-gray-500 mb-2`, typography.captionSemibold]}>
            CASH TENDERED
          </Text>

          <View style={tw`flex-row items-center border border-gray-200 rounded-lg px-3`}>
            <Text style={[tw`text-base text-gray-400 mr-1`, typography.body]}>R</Text>
            <TextInput
              style={[tw`flex-1 py-2.5 text-base`, typography.body]}
              value={cashInput}
              onChangeText={setCashInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#9CA3AF"
              selectTextOnFocus
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={tw`mt-2`}
            contentContainerStyle={tw`gap-2`}
          >
            <TouchableOpacity
              style={tw`px-4 py-2 rounded-lg bg-green-50 border border-green-200`}
              onPress={() => handleQuickCash(amount)}
            >
              <Text style={[tw`text-sm text-green-700`, typography.captionSemibold]}>
                Exact R{amount.toFixed(2)}
              </Text>
            </TouchableOpacity>
            {roundUp10 > amount && (
              <TouchableOpacity
                style={tw`px-4 py-2 rounded-lg bg-gray-50 border border-gray-200`}
                onPress={() => handleQuickCash(roundUp10)}
              >
                <Text style={[tw`text-sm text-gray-700`, typography.captionSemibold]}>
                  R{roundUp10.toFixed(2)}
                </Text>
              </TouchableOpacity>
            )}
            {roundUp50 > amount && roundUp50 !== roundUp10 && (
              <TouchableOpacity
                style={tw`px-4 py-2 rounded-lg bg-gray-50 border border-gray-200`}
                onPress={() => handleQuickCash(roundUp50)}
              >
                <Text style={[tw`text-sm text-gray-700`, typography.captionSemibold]}>
                  R{roundUp50.toFixed(2)}
                </Text>
              </TouchableOpacity>
            )}
            {roundUp100 > amount && roundUp100 !== roundUp50 && (
              <TouchableOpacity
                style={tw`px-4 py-2 rounded-lg bg-gray-50 border border-gray-200`}
                onPress={() => handleQuickCash(roundUp100)}
              >
                <Text style={[tw`text-sm text-gray-700`, typography.captionSemibold]}>
                  R{roundUp100.toFixed(2)}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {changeDue > 0 && (
            <View style={tw`mt-3 bg-amber-50 rounded-lg px-3 py-2 flex-row justify-between`}>
              <Text style={[tw`text-amber-700`, typography.captionSemibold]}>
                Change Due
              </Text>
              <Text style={[tw`text-amber-700`, typography.bodySemibold]}>
                R{changeDue.toFixed(2)}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={tw`mt-3 bg-green-600 rounded-xl py-3 items-center`}
            onPress={handleCashConfirm}
          >
            <Text style={[tw`text-white text-base`, typography.bodySemibold]}>
              Confirm Cash Payment
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
