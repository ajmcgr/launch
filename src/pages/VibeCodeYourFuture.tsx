import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import alexPhoto from '@/assets/alex-vcyf.png';

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

            <div className="prose prose-gray max-w-none space-y-6">
              <p className="text-lg">
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
                You don't need permission. You don't need a co-founder. You don't
                need a perfect idea. You need a small, honest first step. Something
                you can ship this week. Something tiny that proves to yourself that
                you can still make things.
              </p>

              <p>
                That's what Launch is for. It's a quiet little corner of the internet
                where engineers, designers, PMs, data scientists, marketers and
                operators are turning their layoffs into launches. No hustle theatre.
                No "crushing it." Just people building, sharing what they made, and
                cheering each other on.
              </p>

              <p>
                If you want, you can{' '}
                <Link to="/reserve" className="text-primary hover:underline">
                  reserve your founder handle
                </Link>{' '}
                today. It's free. It's a small act, but small acts compound. One
                day you might look back at this week and realize it was the week
                everything changed.
              </p>

              <p>
                You've got this. Take a walk. Drink some water. Then open a blank
                file and start.
              </p>

              <p>
                <strong>You weren't laid off. You were set free.</strong>
              </p>

              <div className="mt-12">
                <div className="flex flex-col items-start">
                  <img
                    src={alexPhoto}
                    alt="Alex MacGregor"
                    className="w-32 h-32 object-cover mb-4"
                  />
                  <h3 className="text-lg font-bold mb-0">Alex MacGregor</h3>
                  <p className="text-lg font-bold mb-4">Founder, Launch</p>
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
