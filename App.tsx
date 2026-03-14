import "expo-router/entry";
import { AppRegistry } from 'react-native';
import { startBackgroundLocation } from './services/BackgroundLocationService';

const BootUpTask = async () => {
    console.log("BootUpTask running - Starting Background Service");
    await startBackgroundLocation();
};

AppRegistry.registerHeadlessTask('BootUpTask', () => BootUpTask);

