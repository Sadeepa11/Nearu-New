import { API_BASE_URL } from '@/utils/auth';
import GoogleAuthService from '@/utils/googleAuth';
import { flushPendingFcmToken, persistFcmToken, registerDeviceAndGetFCMToken } from '@/utils/permissions';
import { AntDesign } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import CountryPicker, { Country, CountryCode } from 'react-native-country-picker-modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlert } from '../context/AlertContext'; // Added

const sanitizeDigits = (value: string) => value.replace(/[^0-9]/g, '');

const normalizePhoneNumber = (prefix: string, rawNumber: string) => {
  const prefixDigits = sanitizeDigits(prefix);
  const normalizedPrefix = prefixDigits ? `+${prefixDigits}` : '';
  const normalizedNumber = sanitizeDigits(rawNumber).replace(/^0+/, '');
  const formattedNumber = normalizedPrefix && normalizedNumber ? `${normalizedPrefix}${normalizedNumber}` : '';
  return { normalizedPrefix, normalizedNumber, formattedNumber };
};

const parseParam = (value?: string | string[]) => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
};

const ensurePrefixFormat = (value: string) => {
  const sanitized = value.replace(/[^0-9+]/g, '');
  const stripped = sanitized.startsWith('+') ? sanitized.slice(1) : sanitized.replace(/^\++/, '');
  const digitsOnly = sanitizeDigits(stripped);
  return digitsOnly ? `+${digitsOnly}` : '+94';
};

const MobileLogInScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert(); // Added
  const params = useLocalSearchParams<{
    phonePrefix?: string | string[];
    phoneDigits?: string | string[];
    name?: string | string[];
  }>();

  const rawPrefixParam = parseParam(params.phonePrefix);
  const rawDigitsParam = parseParam(params.phoneDigits);
  const rawNameParam = parseParam(params.name);

  const [phonePrefix, setPhonePrefix] = useState(() => (rawPrefixParam ? ensurePrefixFormat(rawPrefixParam) : '+94'));
  const [countryCode, setCountryCode] = useState<CountryCode>(() => {
    const p = rawPrefixParam ? ensurePrefixFormat(rawPrefixParam) : '+94';
    if (p === '+94') return 'LK';
    if (p === '+1') return 'US';
    if (p === '+44') return 'GB';
    if (p === '+91') return 'IN';
    return 'LK';
  });
  const [mobileNumber, setMobileNumber] = useState(() => sanitizeDigits(rawDigitsParam));
  const [name, setName] = useState(() => rawNameParam);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    GoogleAuthService.configure();
  }, []);


  useEffect(() => {
    if (rawPrefixParam) {
      const p = ensurePrefixFormat(rawPrefixParam);
      setPhonePrefix(p);
      if (p === '+94') setCountryCode('LK');
      else if (p === '+1') setCountryCode('US');
      else if (p === '+44') setCountryCode('GB');
      else if (p === '+91') setCountryCode('IN');
    }
    if (rawDigitsParam) {
      setMobileNumber(sanitizeDigits(rawDigitsParam));
    }
    if (rawNameParam) {
      setName(rawNameParam);
    }
  }, [rawDigitsParam, rawNameParam, rawPrefixParam]);

  const isFormValid = useMemo(() => {
    const digits = sanitizeDigits(mobileNumber);
    return name.trim().length > 0 && phonePrefix.trim().length > 0 && digits.length >= 6;
  }, [mobileNumber, name, phonePrefix]);

  const handleSendOtp = async () => {
    setErrorMessage(null);
    setInfoMessage(null);

    const trimmedName = name.trim();
    const { normalizedPrefix, normalizedNumber, formattedNumber } = normalizePhoneNumber(phonePrefix, mobileNumber);

    if (!trimmedName) {
      setErrorMessage('Please enter your name.');
      return;
    }

    if (!normalizedPrefix) {
      setErrorMessage('Please include your country code.');
      return;
    }

    if (!normalizedNumber || normalizedNumber.length < 6) {
      setErrorMessage('Enter a valid mobile number.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/phone/send-otp`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: formattedNumber, name: trimmedName }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success !== false) {
        const message = data?.message || 'OTP sent successfully.';
        setInfoMessage(message);

        const devCode = typeof data?.otp === 'string' ? data.otp : typeof data?.code === 'string' ? data.code : null;
        showAlert({ title: 'OTP sent', message: devCode && __DEV__ ? `Use code ${devCode}` : message, type: 'success' });

        router.push({
          pathname: '/screens/PhoneOTPScreen',
          params: {
            phoneNumber: formattedNumber,
            name: trimmedName,
            phonePrefix: normalizedPrefix,
            phoneDigits: normalizedNumber,
          },
        });
      } else {
        setErrorMessage(data?.message || 'Unable to send OTP. Please try again.');
      }
    } catch (error) {
      console.error('Failed to send OTP', error);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setLoading(true);
    try {
      const user = await GoogleAuthService.signIn();
      if (user) {
        try {
          await flushPendingFcmToken();
          const fcmToken = await registerDeviceAndGetFCMToken();
          if (fcmToken) {
            await persistFcmToken(fcmToken);
          }
        } catch (error) {
          console.error('Error registering FCM token after login:', error);
        }
        router.replace('/screens/MapScreen');
      }
    } catch (error: any) {
      console.error('Google login error', error);
      setErrorMessage(error.message || 'An error occurred during Google sign in');
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.container} edges={['right', 'left', 'top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.contentContainer, { paddingBottom: 40 }]}
          keyboardShouldPersistTaps="handled"
        >
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

          <Text style={styles.label}>Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
              editable={!loading}
              autoCapitalize="words"
            />
          </View>

          <Text style={styles.label}>Phone Number</Text>
          <View style={[styles.inputContainer, styles.phoneRow]}>
            <View style={styles.countryPickerContainer}>
              <CountryPicker
                countryCode={countryCode}
                withFilter
                withFlag
                withAlphaFilter
                withCallingCode
                withCallingCodeButton
                onSelect={(country: Country) => {
                  setCountryCode(country.cca2);
                  setPhonePrefix(`+${country.callingCode[0]}`);
                }}
                containerButtonStyle={styles.countryPickerButton}
                modalProps={{
                  animationType: 'slide',
                  presentationStyle: 'fullScreen',
                }}
                filterProps={{
                  placeholder: 'Search for your country',
                  style: {
                    paddingTop: insets.top > 0 ? insets.top : 20,
                  }
                }}
              />
            </View>
            <View style={styles.verticalDivider} />
            <TextInput
              style={styles.phoneInput}
              placeholder="Enter your phone number"
              placeholderTextColor="#9CA3AF"
              value={mobileNumber}
              onChangeText={(value) => setMobileNumber(value.replace(/[^0-9]/g, ''))}
              editable={!loading}
              keyboardType="phone-pad"
              maxLength={15}
            />
          </View>

          <TouchableOpacity onPress={() => router.push('/screens/ForgotPasswordRequest')}>
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {(infoMessage || errorMessage) && (
            <Text style={[styles.messageText, infoMessage ? styles.infoText : styles.errorText]}>
              {infoMessage || errorMessage}
            </Text>
          )}

          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleSendOtp}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.orContainer}>
            <View style={styles.divider} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity style={styles.socialButton} onPress={handleGoogleLogin}>

            <Image
              source={require('../../assets/images/google-logo.png')}
              style={styles.socialIcon}
              contentFit="contain"
            />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.socialButton} onPress={() => {/* Handle Apple Login */ }}>
            <AntDesign name="apple" size={24} color="#000" />
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/screens/LogInScreen')} style={{ marginTop: 12 }}>
            <Text style={styles.emailSignInText}>Sign in with Email</Text>
          </TouchableOpacity>

          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account?</Text>
            <TouchableOpacity onPress={() => router.push('/screens/RegisterScreen')}>
              <Text style={styles.signUpLink}>Register</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingTop: 20,
    flexGrow: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoImage: {
    width: 150,
    height: 150,
  },
  tagline: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '500',
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
  phoneRow: {
    paddingHorizontal: 0,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  countryPickerContainer: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  countryPickerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  prefixInput: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#374151',
    width: 60,
    textAlign: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E5E7EB',
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#374151',
  },
  forgotPasswordText: {
    color: '#6366F1',
    fontWeight: '500',
    marginBottom: 24,
  },
  loginButton: {
    backgroundColor: '#113C9C',
    borderRadius: 14,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  orText: {
    marginHorizontal: 12,
    color: '#9CA3AF',
    fontSize: 14,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 25,
    paddingVertical: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  socialIcon: {
    width: 24,
    height: 24,
  },
  socialButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
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
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    gap: 4
  },
  signUpText: {
    color: '#6B7280'
  },
  signUpLink: {
    color: '#1E40AF',
    fontWeight: 'bold'
  },
  emailSignInText: {
    color: '#1E40AF',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default MobileLogInScreen;
