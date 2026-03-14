import { API_BASE_URL } from '@/utils/auth';
import { flushPendingFcmToken, persistFcmToken, registerDeviceAndGetFCMToken } from '@/utils/permissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputKeyPressEventData,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '../context/AlertContext'; // Added (using relative path)

const RESEND_INTERVAL_SECONDS = 30;
const OTP_LENGTH = 6;

const parseParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
};

const PhoneOTPScreen = () => {
  const router = useRouter();
  const { showAlert } = useAlert(); // Added
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    phoneNumber?: string | string[];
    phonePrefix?: string | string[];
    phoneDigits?: string | string[];
    name?: string | string[];
  }>();
  const phoneNumber = useMemo(() => parseParam(params.phoneNumber), [params.phoneNumber]);
  const name = useMemo(() => parseParam(params.name), [params.name]);
  const phonePrefixParam = useMemo(() => parseParam(params.phonePrefix), [params.phonePrefix]);
  const phoneDigitsParam = useMemo(() => parseParam(params.phoneDigits), [params.phoneDigits]);

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''));
  const inputRefs = useRef<Array<TextInput | null>>([]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [devOtpHint, setDevOtpHint] = useState<string | null>(null);
  const [secondsUntilResend, setSecondsUntilResend] = useState(RESEND_INTERVAL_SECONDS);

  const derivedContact = useMemo(() => {
    if (!phoneNumber) {
      return { prefix: '', digits: '' };
    }
    const match = phoneNumber.match(/^(\+\d{1,4})/);
    const prefix = match ? match[1] : '';
    const digits = prefix ? phoneNumber.slice(prefix.length) : phoneNumber;
    return { prefix, digits };
  }, [phoneNumber]);

  const editPhonePrefix = phonePrefixParam || derivedContact.prefix;
  const editPhoneDigits = phoneDigitsParam || derivedContact.digits;

  useEffect(() => {
    setSecondsUntilResend(RESEND_INTERVAL_SECONDS);
  }, [phoneNumber]);

  useEffect(() => {
    if (secondsUntilResend <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setSecondsUntilResend((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsUntilResend]);

  const formattedPhoneDisplay = phoneNumber || 'your phone number';

  const storeTokensAndNavigate = useCallback(
    async (token: string, refreshToken?: string) => {
      await AsyncStorage.setItem('authToken', token);
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }

      try {
        await flushPendingFcmToken();
        const fcmToken = await registerDeviceAndGetFCMToken();
        if (fcmToken) {
          await persistFcmToken(fcmToken);
        }
      } catch (error) {
        console.error('Error registering FCM token after OTP verification:', error);
      }

      router.replace('/screens/MapScreen');
    },
    [router],
  );

  const handleVerifyOtp = useCallback(async () => {
    const code = otp.join('');
    if (!phoneNumber) {
      setErrorMessage('Missing phone number. Please restart the login process.');
      return;
    }

    if (code.length < OTP_LENGTH) {
      setErrorMessage('Enter the complete OTP sent to your phone.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/phone/verify-otp`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, code, name: name.trim() }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.token) {
        setInfoMessage(data?.message || 'Phone number verified successfully.');
        await storeTokensAndNavigate(data.token, data.refreshToken);
        return;
      }

      if (response.status === 400 || response.status === 401) {
        setErrorMessage(data?.message || 'Invalid or expired OTP. Please try again.');
        return;
      }

      setErrorMessage(data?.message || 'Unable to verify the OTP. Please try again.');
    } catch (error) {
      console.error('Failed to verify OTP', error);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [otp, name, phoneNumber, storeTokensAndNavigate]);

  const handleResendOtp = useCallback(async () => {
    if (!phoneNumber) {
      setErrorMessage('Missing phone number. Please restart the login process.');
      return;
    }

    setResendLoading(true);
    setErrorMessage(null);
    setInfoMessage(null);
    setOtp(new Array(OTP_LENGTH).fill('')); // Clear OTP on resend
    inputRefs.current[0]?.focus(); // Focus first input

    try {
      const response = await fetch(`${API_BASE_URL}/auth/phone/resend-otp`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setInfoMessage(data?.message || 'A new OTP has been sent.');
        setSecondsUntilResend(RESEND_INTERVAL_SECONDS);

        const devCode = typeof data?.otp === 'string' ? data.otp : typeof data?.code === 'string' ? data.code : null;
        if (devCode) {
          setDevOtpHint(`Development OTP: ${devCode}`);
          if (__DEV__) {
            showAlert({ title: 'OTP resent', message: `Use code ${devCode}`, type: 'success' });
          }
        }

        return;
      }

      setErrorMessage(data?.message || 'Unable to resend OTP at the moment.');
    } catch (error) {
      console.error('Failed to resend OTP', error);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }, [phoneNumber]);

  useEffect(() => {
    if (__DEV__) {
      setDevOtpHint((existing) => existing ?? 'Check alert dialogs for the OTP in development builds.');
    }
  }, []);

  const handleChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Move to next input if text is entered
    if (text && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // If current is empty, move to previous and delete logic handled by onChange usually, 
        // but for empty backspace we need explicit move
        inputRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = ''; // Optional: clear previous too
        setOtp(newOtp);
      }
    }
  };

  const canResend = secondsUntilResend <= 0 && !resendLoading;
  const isOtpComplete = otp.every(digit => digit !== '');

  if (!phoneNumber) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 32 + insets.bottom }]}
      >
        <Text style={[styles.headerText, { marginBottom: 16 }]}>Missing phone number</Text>
        <Text style={[styles.messageText, styles.infoText, { textAlign: 'center' }]}>We could not find a phone number for this session. Please restart the sign-in flow and try again.</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.replace('/screens/MobileLogIn')}>
          <Text style={styles.buttonText}>Back to Phone Login</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

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
        <Text style={styles.headerText}>Verify Code</Text>
        <Text style={styles.subText}>
          We sent an OTP to {formattedPhoneDisplay}
        </Text>

        <Text style={styles.label}>Enter Code</Text>
        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <View key={index} style={styles.otpBox}>
              <TextInput
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={styles.otpInput}
                value={digit}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
                editable={!loading}
                textAlign="center"
              />
            </View>
          ))}
        </View>

        {(infoMessage || errorMessage) && (
          <Text style={[styles.messageText, errorMessage ? styles.errorText : styles.infoText]}>
            {errorMessage || infoMessage}
          </Text>
        )}

        {devOtpHint && __DEV__ && <Text style={styles.devOtpHint}>{devOtpHint}</Text>}

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[styles.button, isOtpComplete && styles.buttonActive]}
            onPress={handleVerifyOtp}
            disabled={loading || !isOtpComplete}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                Verify
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.resendButton} onPress={handleResendOtp} disabled={!canResend}>
            <Text
              style={[
                styles.resendText,
                !canResend && styles.resendDisabledText,
              ]}
            >
              {canResend ? 'Resend code' : `Resend in ${secondsUntilResend}s`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.editNumberButton}
            onPress={() =>
              router.replace({
                pathname: '/screens/MobileLogIn',
                params: {
                  phonePrefix: editPhonePrefix,
                  phoneDigits: editPhoneDigits,
                  name,
                },
              })
            }
          >
            <Text style={styles.editNumberText}>Edit phone number</Text>
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  label: {
    fontSize: 14,
    color: '#1E3A8A',
    marginBottom: 12,
    fontWeight: '500',
    alignSelf: 'flex-start' // Ensure label aligns with boxes container
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  otpBox: {
    flex: 1,
    aspectRatio: 1, // Make them square
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12, // Slightly more rounded
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpInput: {
    fontSize: 24,
    color: '#1E40AF',
    fontWeight: 'bold',
    width: '100%',
    height: '100%',
    textAlign: 'center',
    padding: 0, // Remove padding to center accurately
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
    marginTop: 10,
  },
  button: {
    backgroundColor: '#9CA3AF', // Disabled state color by default
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  buttonActive: {
    backgroundColor: '#113C9C', // Active verified color
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resendButton: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  resendText: {
    color: '#1E40AF',
    fontWeight: '600',
    fontSize: 16,
  },
  resendDisabledText: {
    color: '#9CA3AF',
  },
  editNumberButton: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  editNumberText: {
    color: '#6B7280',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  devOtpHint: {
    color: '#059669',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 8,
  },
});

export default PhoneOTPScreen;
