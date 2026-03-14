import { API_BASE_URL } from '@/utils/auth';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_PROMPT = 'Enter the verification code sent to your email.';

const VerifyEmailScreen = () => {
    const params = useLocalSearchParams<{ email?: string | string[]; message?: string | string[] }>();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const initialEmail = useMemo(() => {
        const value = params.email;
        return Array.isArray(value) ? value[0] ?? '' : value ?? '';
    }, [params.email]);

    const initialMessage = useMemo(() => {
        const value = params.message;
        return Array.isArray(value) ? value[0] : value;
    }, [params.message]);

    const [email, setEmail] = useState(initialEmail);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(initialMessage ?? DEFAULT_PROMPT);

    const handleVerify = async () => {
        if (!email.trim()) {
            setErrorMessage('Please enter your email.');
            return;
        }

        if (!code.trim()) {
            setErrorMessage('Please enter the verification code.');
            return;
        }

        setLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-email`, {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, code }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                const message = data.message || 'Email verified successfully. You can sign in now.';
                router.replace({ pathname: '/screens/LogInScreen', params: { email, message } });
                return;
            }

            setErrorMessage(data.message || 'Verification failed. Please try again.');
        } catch (error) {
            console.error('Error verifying email:', error);
            setErrorMessage('Unable to contact the server. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!email.trim()) {
            setErrorMessage('Please enter your email to resend the code.');
            return;
        }

        setResendLoading(true);
        setErrorMessage(null);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/resend-email-verification`, {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setInfoMessage(data.message || DEFAULT_PROMPT);
                return;
            }

            setErrorMessage(data.message || 'Unable to resend verification code.');
        } catch (error) {
            console.error('Error resending verification code:', error);
            setErrorMessage('Unable to contact the server. Please try again.');
        } finally {
            setResendLoading(false);
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
                {/* Logo */}
                <View style={styles.logoContainer}>
                    <Image
                        source={require('../../assets/logo/image.png')}
                        style={styles.logoImage}
                        contentFit="contain"
                    />
                </View>
                <Text style={styles.tagline}>Stay connected with your family</Text>
            </View>

            <View style={styles.formContainer}>
                <Text style={styles.headerText}>Verify Email</Text>

                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Your email"
                        placeholderTextColor="#9CA3AF"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!loading && !resendLoading}
                    />
                </View>

                <Text style={styles.label}>Verification code</Text>
                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter code"
                        placeholderTextColor="#9CA3AF"
                        value={code}
                        onChangeText={setCode}
                        autoCapitalize="characters"
                        editable={!loading}
                    />
                </View>

                {(infoMessage || errorMessage) && (
                    <Text style={[styles.messageText, errorMessage ? styles.errorText : styles.infoText]}>
                        {errorMessage || infoMessage}
                    </Text>
                )}
            </View>

            <View style={styles.bottomContainer}>
                <TouchableOpacity
                    style={[
                        styles.button,
                        email.trim() && code.trim() && styles.buttonActive,
                    ]}
                    onPress={handleVerify}
                    disabled={loading || !email.trim() || !code.trim()}
                >
                    {loading ? (
                        <ActivityIndicator color={email.trim() && code.trim() ? '#fff' : '#fff'} />
                    ) : (
                        <Text
                            style={[
                                styles.buttonText,
                                email.trim() && code.trim() && styles.buttonTextActive,
                            ]}
                        >
                            Verify Email
                        </Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleResendCode}
                    disabled={resendLoading || loading}
                >
                    {resendLoading ? (
                        <ActivityIndicator color="#1E40AF" size="small" />
                    ) : (
                        <Text style={styles.resendText}>Resend Code</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.signInContainer}>
                    <Text style={styles.signInText}>Ready to sign in?</Text>
                    <TouchableOpacity onPress={() => router.replace({ pathname: '/screens/LogInScreen', params: { email } })}>
                        <Text style={styles.signInLink}>Back to login</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    contentContainer: {
        paddingHorizontal: 24,
        paddingTop: 80,
        flexGrow: 1,
    },
    backButton: {
        position: 'absolute',
        top: 40,
        left: 20,
        zIndex: 10,
        padding: 8,
    },
    backButtonText: {
        fontSize: 36,
        color: '#1E3A8A',
        fontWeight: '300',
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    logoImage: {
        width: 120,
        height: 120,
    },
    tagline: {
        fontSize: 16,
        color: '#1E3A8A',
        fontWeight: '500',
    },
    formContainer: {
        marginBottom: 20,
    },
    headerText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E3A8A',
        marginBottom: 24,
        textAlign: 'center',
    },
    label: {
        fontSize: 14,
        color: '#1E3A8A',
        marginBottom: 8,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: '#fff',
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 12,
        fontSize: 16,
        color: '#374151',
    },
    messageText: {
        textAlign: 'center',
        marginBottom: 16,
    },
    infoText: {
        color: '#059669',
    },
    errorText: {
        color: '#DC2626',
    },
    bottomContainer: {
        marginTop: 'auto',
    },
    button: {
        backgroundColor: '#9CA3AF',
        borderRadius: 14,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonActive: {
        backgroundColor: '#113C9C',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonTextActive: {
        color: '#FFFFFF',
    },
    resendButton: {
        alignSelf: 'center',
        marginBottom: 24,
        padding: 8,
    },
    resendText: {
        color: '#1E40AF',
        fontWeight: '600',
        fontSize: 16,
    },
    signInContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
        marginBottom: 20,
    },
    signInText: {
        color: '#6B7280',
        fontSize: 16,
    },
    signInLink: {
        color: '#1E40AF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default VerifyEmailScreen;
