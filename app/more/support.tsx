import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import tw from '@/styles/tailwind';
import { Text } from '@/components/Text';
import { typography } from '@/styles/typography';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

interface ContactOption {
  icon: IconName;
  color: string;
  label: string;
  subtitle: string;
  onPress: () => void;
}

function openUrl(url: string) {
  Linking.canOpenURL(url).then((supported) => {
    if (supported) {
      Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Could not open this link.');
    }
  });
}

export default function SupportScreen() {
  const appVersion =
    (require('../../app.json') as any).expo?.version || '1.0.0';

  const contactOptions: ContactOption[] = [
    {
      icon: 'email-outline',
      color: '#3B82F6',
      label: 'Email Support',
      subtitle: 'support@nexo.co.za',
      onPress: () =>
        openUrl(
          `mailto:support@nexo.co.za?subject=Nexo%20Mobile%20Support%20(v${appVersion})`
        ),
    },
    {
      icon: 'phone-outline',
      color: '#10B981',
      label: 'Call Support',
      subtitle: '+27 11 000 0000',
      onPress: () => openUrl('tel:+27110000000'),
    },
    {
      icon: 'whatsapp',
      color: '#25D366',
      label: 'WhatsApp',
      subtitle: 'Chat with us on WhatsApp',
      onPress: () => openUrl('https://wa.me/27110000000'),
    },
    {
      icon: 'web',
      color: '#6366F1',
      label: 'Help Center',
      subtitle: 'Browse articles & guides',
      onPress: () => openUrl('https://help.nexo.co.za'),
    },
  ];

  const faqItems = [
    {
      q: 'How do I open a shift?',
      a: 'Go to More > Shift Management and tap "Start Shift". Enter your starting cash amount and confirm.',
    },
    {
      q: 'How do I process a payment?',
      a: 'From an open order, tap "Pay" to see payment options. You can split bills, accept cash, card, or other methods.',
    },
    {
      q: 'How do I void an item?',
      a: 'Tap on the item in the order, select "Void", choose a reason, and confirm. Manager approval may be required.',
    },
    {
      q: 'How do I transfer a table?',
      a: 'From the table view, tap the transfer icon and select the target table or server.',
    },
    {
      q: 'Where do I find reports?',
      a: 'Go to More > Reports. For detailed analytics, use the Web Portal accessible from the More screen.',
    },
  ];

  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  return (
    <>
      <Stack.Screen
        options={{ title: 'Help & Support', headerShown: true, headerBackTitle: 'Back' }}
      />
      <ScrollView
        style={tw`flex-1 bg-gray-50`}
        contentContainerStyle={tw`pb-12`}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={tw`bg-white mx-4 mt-4 rounded-2xl p-6 items-center`}>
          <View
            style={tw`w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-4`}
          >
            <MaterialCommunityIcons name="lifebuoy" size={32} color="#3B82F6" />
          </View>
          <Text style={[tw`text-lg text-center`, typography.headingSemibold]}>
            How can we help?
          </Text>
          <Text style={[tw`text-sm text-gray-500 text-center mt-1`, typography.caption]}>
            Our support team is here to help you get the most out of Nexo.
          </Text>
        </View>

        {/* Contact Options */}
        <View style={tw`mt-5`}>
          <Text
            style={[
              tw`text-xs text-gray-400 px-5 mb-2`,
              typography.captionSemibold,
              { letterSpacing: 0.8 },
            ]}
          >
            CONTACT US
          </Text>
          <View style={tw`mx-4 bg-white rounded-xl overflow-hidden`}>
            {contactOptions.map((opt, idx) => (
              <TouchableOpacity
                key={opt.label}
                style={tw`flex-row items-center px-4 py-3.5 ${
                  idx < contactOptions.length - 1 ? 'border-b border-gray-50' : ''
                }`}
                onPress={opt.onPress}
                activeOpacity={0.6}
              >
                <View
                  style={[
                    tw`w-9 h-9 rounded-xl items-center justify-center mr-3`,
                    { backgroundColor: opt.color + '12' },
                  ]}
                >
                  <MaterialCommunityIcons name={opt.icon} size={20} color={opt.color} />
                </View>
                <View style={tw`flex-1`}>
                  <Text style={[tw`text-base`, typography.body]}>{opt.label}</Text>
                  <Text style={[tw`text-xs text-gray-400`, typography.small]}>
                    {opt.subtitle}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="open-in-new"
                  size={18}
                  color="#D1D5DB"
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ */}
        <View style={tw`mt-5`}>
          <Text
            style={[
              tw`text-xs text-gray-400 px-5 mb-2`,
              typography.captionSemibold,
              { letterSpacing: 0.8 },
            ]}
          >
            FREQUENTLY ASKED
          </Text>
          <View style={tw`mx-4 bg-white rounded-xl overflow-hidden`}>
            {faqItems.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={tw`px-4 py-3.5 ${
                    idx < faqItems.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                  onPress={() => setExpandedFaq(isOpen ? null : idx)}
                  activeOpacity={0.7}
                >
                  <View style={tw`flex-row items-center`}>
                    <MaterialCommunityIcons
                      name="help-circle-outline"
                      size={18}
                      color="#6366F1"
                      style={tw`mr-3`}
                    />
                    <Text style={[tw`flex-1 text-sm`, typography.captionSemibold]}>
                      {faq.q}
                    </Text>
                    <MaterialCommunityIcons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#D1D5DB"
                    />
                  </View>
                  {isOpen && (
                    <Text style={[tw`text-sm text-gray-500 mt-2 ml-8`, typography.caption]}>
                      {faq.a}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Version & Device Info */}
        <View style={tw`items-center mt-6`}>
          <Text style={[tw`text-xs text-gray-300`, typography.small]}>
            Nexo v{appVersion} &middot; {Platform.OS} {Platform.Version}
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
