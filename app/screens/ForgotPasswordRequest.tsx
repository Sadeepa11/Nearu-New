import { API_BASE_URL } from '@/utils/auth';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from './authStyles';

const ForgotPasswordRequest = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleRequestReset = async () => {
        if (!input.trim()) {
            setErrorMessage('Please enter your email or phone number.');
            return;
        }

        setLoading(true);
        setErrorMessage(null);

        const isEmail = input.includes('@');
        const payload = {
            email: isEmail ? input.trim() : null,
            phoneNumber: isEmail ? null : input.trim(),
        };

        try {
            const response = await fetch(`${API_BASE_URL}/auth/password/request-reset`, {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok) {
                // Success: Navigate to verification screen
                router.push({
                    pathname: '/screens/ForgotPasswordVerify',
                    params: {
                        contact: input.trim(),
                        isEmail: isEmail ? 'true' : 'false',
                    }
                });
            } else {
                setErrorMessage(data.message || 'Failed to send reset code. Please try again.');
            }
        } catch (error) {
            console.error('Error requesting password reset:', error);
            setErrorMessage('Unable to contact the server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.contentContainer, { paddingBottom: 32 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
        >
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>

            <View style={styles.header}>
                <Text style={styles.headerText}>Forgot Password</Text>
                <Text style={[styles.messageText, styles.infoText, { marginTop: 10 }]}>
                    Enter your email or mobile number to receive a reset code.
                </Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={styles.input}
                            placeholder="Email or Mobile Number"
                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                            value={input}
                            onChangeText={setInput}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!loading}
                        />
                    </View>

                    {errorMessage && (
                        <Text style={[styles.messageText, styles.errorText]}>
                            {errorMessage}
                        </Text>
                    )}
                </View>

                <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                    <TouchableOpacity
                        style={[styles.continueButton, input.trim() && styles.continueButtonActive]}
                        onPress={handleRequestReset}
                        disabled={loading || !input.trim()}
                    >
                        {loading ? (
                            <ActivityIndicator color={input.trim() ? '#8B5CF6' : '#fff'} />
                        ) : (
                            <Text style={[styles.continueButtonText, input.trim() && styles.continueButtonTextActive]}>
                                Send Reset Code
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

export default ForgotPasswordRequest;
