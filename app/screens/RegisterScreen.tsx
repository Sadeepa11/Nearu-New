import { API_BASE_URL } from '@/utils/auth';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MIN_PASSWORD_LENGTH = 6;

const RegisterScreen = () => {
	const router = useRouter();
	const insets = useSafeAreaInsets();

	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [infoMessage, setInfoMessage] = useState<string | null>(null);

	const validate = () => {
		if (!name.trim()) {
			setErrorMessage('Please enter your name.');
			return false;
		}

		if (!email.trim()) {
			setErrorMessage('Please enter your email.');
			return false;
		}

		if (!password) {
			setErrorMessage('Please enter your password.');
			return false;
		}

		if (password.length < MIN_PASSWORD_LENGTH) {
			setErrorMessage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
			return false;
		}

		if (password !== confirmPassword) {
			setErrorMessage('Passwords do not match.');
			return false;
		}

		return true;
	};

	const handleRegister = async () => {
		if (!validate()) {
			return;
		}

		setLoading(true);
		setErrorMessage(null);
		setInfoMessage(null);

		try {
			const response = await fetch(`${API_BASE_URL}/auth/register`, {
				method: 'POST',
				headers: {
					accept: 'application/json',
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password, name }),
			});

			const data = await response.json();

			if (response.status === 201 || (response.ok && data.success)) {
				const message = data.message || 'Account created. Check your email for the verification code.';
				setInfoMessage(message);
				router.replace({
					pathname: '/screens/VerifyEmailScreen',
					params: { email, message },
				});
				return;
			}

			setErrorMessage(data.message || 'Registration failed. Please try again.');
		} catch (error) {
			console.error('Error registering user:', error);
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
				<Text style={styles.label}>Name</Text>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="Your Name"
						placeholderTextColor="#9CA3AF"
						value={name}
						onChangeText={setName}
						autoCapitalize="words"
						editable={!loading}
					/>
				</View>

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
						editable={!loading}
					/>
				</View>

				<Text style={styles.label}>Password</Text>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="********"
						placeholderTextColor="#9CA3AF"
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						editable={!loading}
					/>
				</View>

				<Text style={styles.label}>Confirm Password</Text>
				<View style={styles.inputContainer}>
					<TextInput
						style={styles.input}
						placeholder="********"
						placeholderTextColor="#9CA3AF"
						value={confirmPassword}
						onChangeText={setConfirmPassword}
						secureTextEntry
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
						styles.continueButton,
						name.trim() && email.trim() && password && confirmPassword && styles.continueButtonActive,
					]}
					onPress={handleRegister}
					disabled={
						loading ||
						!name.trim() ||
						!email.trim() ||
						!password ||
						!confirmPassword
					}
				>
					{loading ? (
						<ActivityIndicator color={name.trim() && email.trim() && password && confirmPassword ? '#fff' : '#fff'} />
					) : (
						<Text
							style={[
								styles.continueButtonText,
								name.trim() && email.trim() && password && confirmPassword && styles.continueButtonTextActive,
							]}
						>
							Register
						</Text>
					)}
				</TouchableOpacity>

				<View style={styles.signUpContainer}>
					<Text style={styles.signUpText}>Already have an account?</Text>
					<TouchableOpacity onPress={() => router.replace({ pathname: '/screens/LogInScreen', params: { email } })}>
						<Text style={styles.signUpLink}>Sign in</Text>
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
	continueButton: {
		backgroundColor: '#113C9C',
		borderRadius: 14,
		height: 56,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 24,
	},
	continueButtonActive: {
		backgroundColor: '#113C9C',
	},
	continueButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: 'bold',
	},
	continueButtonTextActive: {
		color: '#FFFFFF',
	},
	signUpContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 4,
		marginBottom: 20,
	},
	signUpText: {
		color: '#6B7280',
		fontSize: 16,
	},
	signUpLink: {
		color: '#1E40AF',
		fontWeight: 'bold',
		fontSize: 16,
	}
});

export default RegisterScreen;
