import { verifySignature, generateKeyPair } from '../utils/ffiBridge.js';

// Listen for commands from the parent process
process.on('message', async (message) => {
  const { id, action, payload } = message;

  try {
    if (action === 'verifySignature') {
      const { signature, publicKey, msg } = payload;
      const result = await verifySignature(signature, publicKey, msg);
      
      process.send({
        id,
        success: true,
        data: result
      });
    } else if (action === 'generateKeyPair') {
      const { algorithm, keySize } = payload;
      const result = await generateKeyPair(algorithm, keySize);
      
      process.send({
        id,
        success: true,
        data: result
      });
    } else {
      throw new Error(`Unsupported native worker action: ${action}`);
    }
  } catch (err) {
    process.send({
      id,
      success: false,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      }
    });
  }
});

// Explicit listener to keep process from exiting prematurely
process.on('disconnect', () => {
  process.exit(0);
});
