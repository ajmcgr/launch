const Terms = () => {
  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose prose-gray max-w-none space-y-6">
          <p className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2 className="text-2xl font-bold mt-8 mb-4">1. Acceptance of Terms</h2>
          <p>
            By accessing and using TryLaunch.ai, you accept and agree to be bound by the terms
            and provision of this agreement.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">2. Use License</h2>
          <p>
            Permission is granted to temporarily use TryLaunch.ai for personal, non-commercial
            transitory viewing only.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">3. Product Submissions</h2>
          <p>
            When you submit a product to TryLaunch.ai, you represent that you have the right
            to do so and that the information provided is accurate.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">4. User Conduct</h2>
          <p>
            Users agree not to engage in any activity that interferes with or disrupts the
            services or servers or networks connected to the services.
          </p>

          <h2 className="text-2xl font-bold mt-8 mb-4">5. Modifications</h2>
          <p>
            TryLaunch.ai reserves the right to modify these terms at any time. Continued use
            of the platform constitutes acceptance of the modified terms.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
