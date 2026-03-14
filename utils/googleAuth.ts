import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { loginWithGoogle, storeTokens } from './auth';

// 🛠️ Configuration Constants
const WEB_CLIENT_ID = "344292197283-j1toojur03c7eqemuf3281akre64j9ed.apps.googleusercontent.com";
const IOS_CLIENT_ID = "344292197283-colf5qfpl7fassofc62bks8vka6qf8kq.apps.googleusercontent.com";

/**
 * GoogleAuthService - A singleton service to handle Google Authentication
 */
const GoogleAuthService = {

    /**
     * ✅ Initialize Google Sign-In
     * Call this in your App.js or root component's useEffect
     */
    configure: () => {
        GoogleSignin.configure({
            webClientId: WEB_CLIENT_ID,
            iosClientId: IOS_CLIENT_ID,
            offlineAccess: false,
            forceCodeForRefreshToken: true,
        });
    },

    /**
     * ✅ Check if a user is already logged in (Persistent Login)
     * @returns {Promise<Object|null>} The user object if found, null otherwise
     */
    checkLocalUser: async () => {
        try {
            const storedUser = await AsyncStorage.getItem('user');
            if (storedUser) {
                return JSON.parse(storedUser);
            }
        } catch (e) {
            console.log('Error checking stored user:', e);
        }
        return null;
    },

    /**
     * ✅ Perform Google Sign-In
     * Handles the Google prompt, error handling, and backend verification
     * @returns {Promise<Object>} The authenticated user object
     */
    signIn: async () => {
        try {
            // 1. Check Play Services
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            // 2. Sign In with Google
            const response = await GoogleSignin.signIn();

            // Handle different response structures across versions
            const idToken = (response.data as any)?.idToken || (response as any).idToken;
            const googleUserInfo = (response.data as any)?.user || (response as any).user;

            if (!idToken) {
                throw new Error('No ID token found in Google Sign-In response');
            }
            console.log('✅ Google sign-in successful. Token obtained.');

            // 3. Backend Verification (Secure ID Token Exchange)
            const apiResponse = await loginWithGoogle(idToken);
            console.log('📡 API Response Status:', apiResponse.status);

            const data = await apiResponse.json();

            if (apiResponse.ok && data.token) {
                // --- Successful Login ---
                const finalUser = {
                    ...data.user, // User data from backend
                    googlePhoto: googleUserInfo?.photo, // Merge Google photo if needed
                };

                console.log('👤 User authenticated. Final object:', finalUser);

                // Save tokens and user to local storage
                await storeTokens(data.token, data.refreshToken);
                await AsyncStorage.setItem('user', JSON.stringify(finalUser));

                return finalUser;

            } else {
                // --- Error or New User Handled by Backend ---
                // If your backend handles registration automatically (which it seems to), 
                // this branch captures failures.
                throw new Error(data.message || `Server error: Received status ${apiResponse.status}`);
            }

        } catch (err: any) {
            // Improved Error Handling
            let errorMessage = 'An unknown error occurred';
            if (err.code === statusCodes.SIGN_IN_CANCELLED) {
                errorMessage = 'Sign in cancelled';
            } else if (err.code === statusCodes.IN_PROGRESS) {
                errorMessage = 'Sign in is already in progress';
            } else if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                errorMessage = 'Play Services not available';
            } else {
                errorMessage = err.message || JSON.stringify(err);
            }
            console.log('Error during login process:', errorMessage);
            throw new Error(errorMessage);
        }
    },

    /**
     * ✅ Sign Out
     * Clears Google Session and Local Storage
     */
    signOut: async () => {
        try {
            await GoogleSignin.signOut();
            await AsyncStorage.removeItem('user');
            // Note: You should also call removeTokens() from auth.ts if it exists
            console.log('👋 User signed out');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    }
};

export default GoogleAuthService;
