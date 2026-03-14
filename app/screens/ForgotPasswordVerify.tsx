import { API_BASE_URL } from '@/utils/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import styles from './authStyles';

const ForgotPasswordVerify = () => {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams<{ contact: string; isEmail: string }>();

    const contact = Array.isArray(params.contact) ? params.contact[0] : params.contact;
    const isEmail = (Array.isArray(params.isEmail) ? params.isEmail[0] : params.isEmail) === 'true';

    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleVerifyCode = async () => {
        if (!code.trim()) {
            setErrorMessage('Please enter the reset code.');
            return;
        }

        setLoading(true);
        setErrorMessage(null);

        const payload = {
            email: isEmail ? contact : null,
            phoneNumber: isEmail ? null : contact,
            code: code.trim(),
        };

        try {
            const response = await fetch(`${API_BASE_URL}/auth/password/verify-code`, {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Success: Navigate to reset password screen with resetId
                router.push({
                    pathname: '/screens/ForgotPasswordReset',
                    params: {
                        resetId: data.resetId,
                    }
                });
            } else {
                setErrorMessage(data.message || 'Invalid or expired reset code.');
            }
        } catch (error) {
            console.error('Error verifying reset code:', error);
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
                <Text style={styles.headerText}>Verify Code</Text>
                <Text style={[styles.messageText, styles.infoText, { marginTop: 10 }]}>
                    Enter the code sent to your {isEmail ? 'email' : 'phone'}.
                </Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    {/* Read-only contact input */}
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={[styles.input, { opacity: 0.7 }]}
                            value={contact}
                            editable={false}
                        />
                    </View>

                    {/* Reset Code Input */}
                    <View style={styles.inputGroup}>
                        <TextInput
                            style={styles.input}
                            placeholder="Reset Code"
                            placeholderTextColor="rgba(255, 255, 255, 0.5)"
                            value={code}
                            onChangeText={setCode}
                            autoCapitalize="none"
                            keyboardType="default"
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
                        style={[styles.continueButton, code.trim() && styles.continueButtonActive]}
                        onPress={handleVerifyCode}
                        disabled={loading || !code.trim()}
                    >
                        {loading ? (
                            <ActivityIndicator color={code.trim() ? '#8B5CF6' : '#fff'} />
                        ) : (
                            <Text style={[styles.continueButtonText, code.trim() && styles.continueButtonTextActive]}>
                                Verify Code
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

export default ForgotPasswordVerify;
