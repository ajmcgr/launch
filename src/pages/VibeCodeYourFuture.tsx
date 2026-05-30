import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import alexPhoto from '@/assets/alex-vcyf.png';
import signature from '@/assets/signature.png';

const VibeCodeYourFuture = () => {
  return (
    <>
      <Helmet>
        <title>Vibe Code Your Future</title>
        <meta
          name="description"
          content="Recently laid off? Turn uncertainty into momentum. Reserve your founder handle, launch products, and build your future with Launch."
        />
        <link rel="canonical" href="https://trylaunch.ai/vibecodeyourfuture" />
        <meta property="og:title" content="Vibe Code Your Future" />
        <meta
          property="og:description"
          content="Recently laid off? Turn uncertainty into momentum. Reserve your founder handle and build your next chapter."
        />
      </Helmet>

      <div className="min-h-screen bg-background py-16">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="border border-border rounded-lg p-8 md:p-12 bg-card">
            <h1 className="text-4xl font-bold mb-8 text-center">Vibe Code Your Future</h1>

            <div className="prose prose-lg prose-gray max-w-none space-y-6">
              <p className="text-lg text-center">
                An open letter to anyone who was just laid off.
              </p>

              <p>
                <strong>Hey,</strong>
              </p>

              <p>
                If you're reading this, there's a good chance you just lost your job.
                Maybe it was a Slack message. Maybe a calendar invite with no title.
                Maybe an email at 6am. However it happened, I'm sorry. It hurts,
                and it's okay that it hurts.
              </p>

              <p>
                I'm not going to tell you that "everything happens for a reason"
                or that you should be grateful. That's not fair, and it's not the
                point of this letter.
              </p>

              <p>
                The point is this: a lot of the best founders I know started exactly
                where you are right now. Not because they planned it. Because the
                job ended, and they finally had the time, the anger, and the quiet
                to build the thing they'd been thinking about for years.
              </p>

              <p>
                You don't need permission and you certainly don't need a
                co-founder or indeed a perfect idea. You need a small, honest
                first step. Something you can ship this week. Something tiny
                that proves to yourself that you can still make things.
              </p>

              <p>
                I did. I built <a href="https://trylaunch.ai/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Launch</a> without any coding experience into the largest vibe code community in the world.
              </p>

              <p>
                You weren't laid off, you were set free. Take a walk. Drink some water.
              </p>

              <p>
                <strong>Stop applying, and start building. You've got this.</strong>
              </p>

              <div className="mt-12">
                <div className="flex flex-col items-start">
                  <img
                    src={alexPhoto}
                    alt="Alex MacGregor"
                    className="w-32 h-32 object-cover mb-4"
                  />
                  <img
                    src={signature}
                    alt="Alex MacGregor signature"
                    className="h-10 w-auto mb-1"
                  />
                  <h3 className="text-lg font-bold mb-0">Alex MacGregor</h3>
                  <p className="text-lg font-bold mb-2">Founder, Launch</p>
                  <a
                    href="https://x.com/alexmacgregor__"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    Follow me on X
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VibeCodeYourFuture;
