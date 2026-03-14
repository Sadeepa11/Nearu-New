import { StyleSheet } from 'react-native';

const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7C3AED',
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: '300',
  },
  header: {
    marginBottom: 60,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    lineHeight: 40,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  input: {
    borderWidth: 0,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: 30,
    color: '#fff',
    backgroundColor: 'transparent',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  bottomContainer: {
    marginTop: 'auto',
  },
  forgotPasswordButton: {
    alignSelf: 'center',
    marginBottom: 12,
  },
  forgotPasswordText: {
    color: '#D4FF00',
    fontSize: 14,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  continueButtonText: {
    color: '#8B5CF6',
    fontWeight: 'bold',
    fontSize: 18,
  },
  continueButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  continueButtonTextActive: {
    color: '#8B5CF6',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: 'bold',
    fontSize: 16,
  },
  phoneSignInText: {
    color: '#D4FF00',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
  },
  signUpLink: {
    color: '#D4FF00',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  messageText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 8,
  },
  infoText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  errorText: {
    color: '#FCA5A5',
  },
});

export default authStyles;
