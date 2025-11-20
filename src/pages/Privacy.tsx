const Privacy = () => {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose prose-gray max-w-none space-y-6">
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us when you create an account, submit
            a product, or interact with our services.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. How We Use Your Information</h2>
          <p>
            We use the information we collect to provide, maintain, and improve our services,
            to communicate with you, and to protect Launch and our users.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. Information Sharing</h2>
          <p>
            We do not share your personal information with third parties except as described
            in this privacy policy or with your consent.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. Data Security</h2>
          <p>
            We take reasonable measures to help protect information about you from loss, theft,
            misuse, unauthorized access, disclosure, alteration, and destruction.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">5. Your Rights</h2>
          <p>
            You have the right to access, update, or delete your personal information at any time
            through your account settings.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">6. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy, please contact us at{' '}
            <a href="mailto:alex@trylaunch.ai" className="text-primary hover:underline">
              alex@trylaunch.ai
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
