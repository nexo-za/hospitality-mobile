import { StyleSheet, Text, View, TextInput, ScrollView, Alert, Platform } from 'react-native';
import React, { useState } from 'react';
import { Stack } from 'expo-router';
// import EcentricPaymentButton from '../../components/EcentricPaymentButton';

export default function EcentricPaymentScreen() {
  const [amount, setAmount] = useState('10.00');
  const [description, setDescription] = useState('Test Payment');
  const [customerName, setCustomerName] = useState('John Doe');
  const [reference, setReference] = useState(`REF-${Date.now()}`);
  const [paymentResult, setPaymentResult] = useState<string | null>(null);

  // Handle successful payment
  const handlePaymentSuccess = (response: any) => {
    console.log("Payment success:", response);
    
    // Format the response for display
    const resultString = Object.keys(response)
      .map(key => `${key}: ${response[key]}`)
      .join('\n');
    
    setPaymentResult(resultString);
  };

  // Handle payment error
  const handlePaymentError = (error: Error) => {
    console.error("Payment error:", error);
    setPaymentResult(`ERROR: ${error.message}`);
  };

  // Get amount in cents
  const getAmountInCents = () => {
    try {
      return Math.round(parseFloat(amount) * 100);
    } catch (error) {
      console.error("Invalid amount:", error);
      return 1000; // Default to R10.00
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Ecentric Payment Demo' }} />
      
      <View style={styles.header}>
        <Text style={styles.headerText}>Ecentric Payment Integration</Text>
        {Platform.OS !== 'android' && (
          <Text style={styles.warning}>
            Warning: Ecentric Payment is only available on Android devices
          </Text>
        )}
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Amount (R):</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder="Enter amount"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Description:</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter payment description"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Customer Name:</Text>
        <TextInput
          style={styles.input}
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Enter customer name"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Reference:</Text>
        <TextInput
          style={styles.input}
          value={reference}
          onChangeText={setReference}
          placeholder="Enter reference number"
        />
      </View>

      <View style={styles.paymentButtonContainer}>
        {/* <EcentricPaymentButton
          amount={getAmountInCents()}
          description={description}
          customerName={customerName}
          reference={reference}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        /> */}
      </View>

      {paymentResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Payment Result:</Text>
          <Text style={styles.resultText}>{paymentResult}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  warning: {
    color: 'red',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  paymentButtonContainer: {
    marginTop: 16,
    marginBottom: 24,
  },
  resultContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 16,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#555',
  },
}); 