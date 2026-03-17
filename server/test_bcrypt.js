const bcrypt = require('bcryptjs');
(async () => {
    try {
        console.log('Testing bcrypt...');
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Hashed:', hashedPassword);
        const isMatch = await bcrypt.compare(password, hashedPassword);
        console.log('Match:', isMatch);
        console.log('Bcrypt test passed.');
    } catch (e) {
        console.error('Bcrypt test failed:', e);
        process.exit(1);
    }
})();
