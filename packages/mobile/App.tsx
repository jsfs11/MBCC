import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// Types
interface User {
  id: string;
  name: string;
  preferences: UserPreferences;
}

interface UserPreferences {
  moodTrackingFrequency: 'daily' | 'weekly' | 'monthly';
  selectedEmojis: string[];
  notificationsEnabled: boolean;
}

interface MoodEntry {
  id: string;
  emoji: string;
  text: string;
  sentiment: SentimentResult;
  timestamp: Date;
}

interface SentimentResult {
  label: 'POSITIVE' | 'NEGATIVE';
  score: number;
  confidence: number;
}

interface AppState {
  user: User | null;
  isOnboarding: boolean;
  moodEntries: MoodEntry[];
  isLoading: boolean;
  error: string | null;
}

interface AppContextType extends AppState {
  setUser: (user: User) => void;
  completeOnboarding: () => void;
  addMoodEntry: (entry: Omit<MoodEntry, 'id' | 'timestamp'>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// Context
const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Custom hook to access the app context
 * @returns {AppContextType} The app context
 * @throws {Error} If used outside of AppProvider
 */
const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

// Constants
const EMOJI_OPTIONS = ['😊', '😢', '😡', '😴', '🤔', '😍', '😰', '🤗', '😎', '🤯'];
const FREQUENCY_OPTIONS = [
  { value: 'daily' as const, label: 'Daily' },
  { value: 'weekly' as const, label: 'Weekly' },
  { value: 'monthly' as const, label: 'Monthly' },
];

const { width: screenWidth } = Dimensions.get('window');

// Utility Functions

/**
 * Simple sentiment analysis fallback (placeholder for Hugging Face integration)
 * In production, this would use @huggingface/transformers with distilbert-base-uncased-finetuned-sst-2-english
 * @param {string} text - The text to analyze
 * @returns {Promise<SentimentResult>} The sentiment analysis result
 */
const analyzeSentiment = async (text: string): Promise<SentimentResult> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simple keyword-based sentiment analysis as fallback
  const positiveWords = ['happy', 'good', 'great', 'awesome', 'love', 'amazing', 'wonderful'];
  const negativeWords = ['sad', 'bad', 'terrible', 'hate', 'awful', 'horrible', 'angry'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  const isPositive = positiveCount > negativeCount;
  const score = isPositive ? 0.7 + Math.random() * 0.3 : 0.3 + Math.random() * 0.4;
  
  return {
    label: isPositive ? 'POSITIVE' : 'NEGATIVE',
    score,
    confidence: 0.8 + Math.random() * 0.2,
  };
};

/**
 * Validates user input for name field
 * @param {string} name - The name to validate
 * @returns {string | null} Error message or null if valid
 */
const validateName = (name: string): string | null => {
  if (!name.trim()) {
    return 'Name is required';
  }
  if (name.trim().length < 2) {
    return 'Name must be at least 2 characters';
  }
  if (name.trim().length > 50) {
    return 'Name must be less than 50 characters';
  }
  return null;
};

/**
 * Validates mood text input
 * @param {string} text - The mood text to validate
 * @returns {string | null} Error message or null if valid
 */
const validateMoodText = (text: string): string | null => {
  if (!text.trim()) {
    return 'Please describe your mood';
  }
  if (text.trim().length < 3) {
    return 'Please provide more detail about your mood';
  }
  if (text.trim().length > 500) {
    return 'Mood description must be less than 500 characters';
  }
  return null;
};

// Error Boundary Component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children?: React.ReactNode;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false, error: null };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            We're sorry, but something unexpected happened. Please restart the app.
          </Text>
          <TouchableOpacity
            style={styles.errorButton}
            onPress={() => this.setState({ hasError: false, error: null })}
            accessibilityRole="button"
            accessibilityLabel="Try again"
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

// Components

/**
 * Emoji selection component for onboarding
 */
interface EmojiSelectorProps {
  selectedEmojis: string[];
  onEmojiToggle: (emoji: string) => void;
}

const EmojiSelector: React.FC<EmojiSelectorProps> = React.memo(({ selectedEmojis, onEmojiToggle }: EmojiSelectorProps) => {
  return (
    <View style={styles.emojiContainer}>
      <Text style={styles.sectionTitle}>Choose your mood emojis</Text>
      <Text style={styles.sectionSubtitle}>
        Select the emojis that best represent your moods
      </Text>
      <View style={styles.emojiGrid}>
        {EMOJI_OPTIONS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            style={[
              styles.emojiButton,
              selectedEmojis.includes(emoji) && styles.emojiButtonSelected,
            ]}
            onPress={() => onEmojiToggle(emoji)}
            accessibilityRole="button"
            accessibilityLabel={`${emoji} emoji`}
            accessibilityState={{ selected: selectedEmojis.includes(emoji) }}
          >
            <Text style={styles.emojiText}>{emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

EmojiSelector.displayName = 'EmojiSelector';

/**
 * Frequency selector component for onboarding
 */
interface FrequencySelectorProps {
  selectedFrequency: UserPreferences['moodTrackingFrequency'];
  onFrequencySelect: (frequency: UserPreferences['moodTrackingFrequency']) => void;
}

const FrequencySelector: React.FC<FrequencySelectorProps> = React.memo(({ selectedFrequency, onFrequencySelect }: FrequencySelectorProps) => {
  return (
    <View style={styles.frequencyContainer}>
      <Text style={styles.sectionTitle}>How often would you like to track your mood?</Text>
      {FREQUENCY_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[
            styles.frequencyButton,
            selectedFrequency === option.value && styles.frequencyButtonSelected,
          ]}
          onPress={() => onFrequencySelect(option.value)}
          accessibilityRole="button"
          accessibilityLabel={`Track mood ${option.label.toLowerCase()}`}
          accessibilityState={{ selected: selectedFrequency === option.value }}
        >
          <Text
            style={[
              styles.frequencyButtonText,
              selectedFrequency === option.value && styles.frequencyButtonTextSelected,
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
});

FrequencySelector.displayName = 'FrequencySelector';

/**
 * Onboarding screen component
 */
const OnboardingScreen: React.FC = React.memo(() => {
  const { completeOnboarding, setUser, setError } = useAppContext();
  const [currentStep, setCurrentStep] = useState(0);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<UserPreferences['moodTrackingFrequency']>('daily');

  const handleEmojiToggle = useCallback((emoji: string) => {
    setSelectedEmojis((prev: string[]) =>
      prev.includes(emoji)
        ? prev.filter((e: string) => e !== emoji)
        : [...prev, emoji]
    );
  }, []);

  const handleNameChange = useCallback((text: string) => {
    setName(text);
    if (nameError) {
      setNameError(null);
    }
  }, [nameError]);

  const handleNext = useCallback(() => {
    if (currentStep === 0) {
      const error = validateName(name);
      if (error) {
        setNameError(error);
        return;
      }
    }
    
    if (currentStep === 1 && selectedEmojis.length === 0) {
      setError('Please select at least one emoji');
      return;
    }

    if (currentStep < 2) {
      setCurrentStep((prev: number) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep, name, selectedEmojis, frequency]);

  const handleComplete = useCallback(() => {
    const user: User = {
      id: Date.now().toString(),
      name: name.trim(),
      preferences: {
        moodTrackingFrequency: frequency,
        selectedEmojis,
        notificationsEnabled: true,
      },
    };
    
    setUser(user);
    completeOnboarding();
  }, [name, frequency, selectedEmojis, setUser, completeOnboarding]);

  const renderStep = useMemo(() => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.welcomeTitle}>Welcome to Mood Curator!</Text>
            <Text style={styles.welcomeSubtitle}>
              Let's get to know you better
            </Text>
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>What's your name?</Text>
              <TextInput
                style={[styles.textInput, nameError && styles.textInputError]}
                value={name}
                onChangeText={handleNameChange}
                placeholder="Enter your name"
                placeholderTextColor="#999"
                maxLength={50}
                accessibilityLabel="Name input"
                accessibilityHint="Enter your name to personalize the app"
              />
              {nameError && (
                <Text style={styles.errorText} accessibilityRole="alert">
                  {nameError}
                </Text>
              )}
            </View>
          </View>
        );
      case 1:
        return (
          <EmojiSelector
            selectedEmojis={selectedEmojis}
            onEmojiToggle={handleEmojiToggle}
          />
        );
      case 2:
        return (
          <FrequencySelector
            selectedFrequency={frequency}
            onFrequencySelect={setFrequency}
          />
        );
      default:
        return null;
    }
  }, [currentStep, name, nameError, selectedEmojis, frequency, handleEmojiToggle, handleNameChange]);

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentStep + 1) / 3) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              Step {currentStep + 1} of 3
            </Text>
          </View>
          
          {renderStep}
          
          <View style={styles.buttonContainer}>
            {currentStep > 0 && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => setCurrentStep((prev: number) => prev - 1)}
                accessibilityRole="button"
                accessibilityLabel="Go back to previous step"
              >
                <Text style={styles.secondaryButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleNext}
              accessibilityRole="button"
              accessibilityLabel={currentStep === 2 ? 'Complete setup' : 'Continue to next step'}
            >
              <Text style={styles.primaryButtonText}>
                {currentStep === 2 ? 'Complete' : 'Next'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
});

OnboardingScreen.displayName = 'OnboardingScreen';

/**
 * Main app screen component
 */
const MainScreen: React.FC = React.memo(() => {
  const { user, addMoodEntry, setLoading, setError, isLoading } = useAppContext();
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [moodText, setMoodText] = useState('');
  const [moodTextError, setMoodTextError] = useState<string | null>(null);

  const handleMoodTextChange = useCallback((text: string) => {
    setMoodText(text);
    if (moodTextError) {
      setMoodTextError(null);
    }
  }, [moodTextError]);

  const handleSubmitMood = useCallback(async () => {
    if (!selectedEmoji) {
      setError('Please select an emoji');
      return;
    }

    const textError = validateMoodText(moodText);
    if (textError) {
      setMoodTextError(textError);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const sentiment = await analyzeSentiment(moodText);
      
      addMoodEntry({
        emoji: selectedEmoji,
        text: moodText.trim(),
        sentiment,
      });

      // Reset form
      setSelectedEmoji('');
      setMoodText('');
      
      Alert.alert(
        'Mood Recorded!',
        `Your mood has been saved with ${sentiment.confidence > 0.8 ? 'high' : 'moderate'} confidence.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      setError('Failed to analyze mood. Please try again.');
      console.error('Mood submission error:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedEmoji, moodText, addMoodEntry, setLoading, setError]);

  const availableEmojis = useMemo(() => 
    user?.preferences.selectedEmojis || EMOJI_OPTIONS.slice(0, 5),
    [user?.preferences.selectedEmojis]
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.headerContainer}>
            <Text style={styles.welcomeTitle}>
              Hello, {user?.name}! 👋
            </Text>
            <Text style={styles.welcomeSubtitle}>
              How are you feeling today?
            </Text>
          </View>

          <View style={styles.moodInputContainer}>
            <Text style={styles.sectionTitle}>Select your mood</Text>
            <View style={styles.emojiGrid}>
              {availableEmojis.map((emoji: string) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiButton,
                    selectedEmoji === emoji && styles.emojiButtonSelected,
                  ]}
                  onPress={() => setSelectedEmoji(emoji)}
                  accessibilityRole="button"
                  accessibilityLabel={`${emoji} emoji`}
                  accessibilityState={{ selected: selectedEmoji === emoji }}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Describe your mood</Text>
              <TextInput
                style={[
                  styles.textArea,
                  moodTextError && styles.textInputError,
                ]}
                value={moodText}
                onChangeText={handleMoodTextChange}
                placeholder="Tell us more about how you're feeling..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                maxLength={500}
                accessibilityLabel="Mood description input"
                accessibilityHint="Describe your current mood in detail"
              />
              <Text style={styles.characterCount}>
                {moodText.length}/500
              </Text>
              {moodTextError && (
                <Text style={styles.errorText} accessibilityRole="alert">
                  {moodTextError}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!selectedEmoji || !moodText.trim() || isLoading) && styles.primaryButtonDisabled,
              ]}
              onPress={handleSubmitMood}
              disabled={!selectedEmoji || !moodText.trim() || isLoading}
              accessibilityRole="button"
              accessibilityLabel="Submit mood entry"
              accessibilityState={{ disabled: !selectedEmoji || !moodText.trim() || isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Record Mood</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
});

MainScreen.displayName = 'MainScreen';

/**
 * App provider component for state management
 */
interface AppProviderProps {
  children: React.ReactNode;
}

const AppProvider: React.FC<AppProviderProps> = ({ children }: AppProviderProps) => {
  const [state, setState] = useState<AppState>({
    user: null,
    isOnboarding: true,
    moodEntries: [],
    isLoading: false,
    error: null,
  });

  const setUser = useCallback((user: User) => {
    setState((prev: AppState) => ({ ...prev, user }));
  }, []);

  const completeOnboarding = useCallback(() => {
    setState((prev: AppState) => ({ ...prev, isOnboarding: false }));
  }, []);

  const addMoodEntry = useCallback((entry: Omit<MoodEntry, 'id' | 'timestamp'>) => {
    const newEntry: MoodEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setState((prev: AppState) => ({
      ...prev,
      moodEntries: [newEntry, ...prev.moodEntries],
    }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev: AppState) => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev: AppState) => ({ ...prev, error }));
  }, []);

  const contextValue = useMemo<AppContextType>(() => ({
    ...state,
    setUser,
    completeOnboarding,
    addMoodEntry,
    setLoading,
    setError,
  }), [state, setUser, completeOnboarding, addMoodEntry, setLoading, setError]);

  // Show error alert when error state changes
  useEffect(() => {
    if (state.error) {
      Alert.alert('Error', state.error, [
        { text: 'OK', onPress: () => setError(null) }
      ]);
    }
  }, [state.error, setError]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

/**
 * Main App component
 */
const App: React.FC = () => {
  const [isAccessibilityEnabled, setIsAccessibilityEnabled] = useState(false);

  useEffect(() => {
    // Check accessibility settings
    AccessibilityInfo.isReduceMotionEnabled().then(setIsAccessibilityEnabled);
    
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsAccessibilityEnabled
    );

    return () => subscription?.remove();
  }, []);

  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
        <StatusBar style="auto" />
      </AppProvider>
    </ErrorBoundary>
  );
};

/**
 * App content component that uses context
 */
const AppContent: React.FC = () => {
  const { isOnboarding } = useAppContext();

  return isOnboarding ? <OnboardingScreen /> : <MainScreen />;
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  headerContainer: {
    marginBottom: 30,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    lineHeight: 24,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007bff',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  stepContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2c3e50',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2c3e50',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  textInputError: {
    borderColor: '#dc3545',
  },
  characterCount: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
    marginTop: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#dc3545',
    marginTop: 4,
  },
  emojiContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  emojiButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#dee2e6',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  emojiButtonSelected: {
    borderColor: '#007bff',
    backgroundColor: '#e3f2fd',
  },
  emojiText: {
    fontSize: 24,
  },
  frequencyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  frequencyButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  frequencyButtonSelected: {
    borderColor: '#007bff',
    backgroundColor: '#e3f2fd',
  },
  frequencyButtonText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
  frequencyButtonTextSelected: {
    color: '#007bff',
  },
  moodInputContainer: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryButtonText: {
    color: '#007bff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    padding: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;