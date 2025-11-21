const Blog = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="w-full" style={{ height: 'calc(100vh - 200px)' }}>
        <iframe
          src="https://trylaunch.beehiiv.com/"
          className="w-full h-full border-0 rounded-lg"
          title="Launch Blog"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
};

export default Blog;
