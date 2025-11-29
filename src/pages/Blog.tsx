import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Blog = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.open('https://newsletter.trylaunch.ai', '_blank');
    navigate('/');
  }, [navigate]);

  return null;
};

export default Blog;
