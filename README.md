## Links

Play the game: [https://www.toothrush.win]()  
Devpost: [https://devpost.com/software/toothrush]()

## Inspiration
Let's be honest, how many Hack the North participants actually brushed their teeth this weekend? Based on what we smelled... not enough.
Two minutes spent mindlessly scrubbing your teeth feels like forever when you could be playing Subway Surfers instead.
That's why we created ToothRush. Your teeth (and everyone sitting near you) will thank us later.

## What it does
ToothRush is a game that you control through the physical act of brushing your teeth. The movement and position of your hand as you do so is tracked by a computer vision model. You play as an anthropomorphic tooth, running down a busy highway in the opposite direction of the flow of traffic. Your goal is to achieve the highest score possible within the span of two minutes - the amount of time most dentistry professionals recommend to allocate for each session of toothbrushing.

You increase your score by collecting the tubes of toothpaste scattered on the road. You must avoid oncoming vehicles, which slow your progress, as well as pieces of candy, which will decrease your score. To accomplish this, you are able to jump between three lanes of traffic, controlled by the pitch of your hand. Your forward movement is directly tied to the speed in which you move your hand in a brushing motion. These mechanics are all designed to encourage thorough oral hygiene.

Finally, there is a leaderboard so you can hold your peers accountable when you find out they didn't brush their teeth!

## How we built it
For our frontend, we utilize React in order to provide a performant and reactive interface. Our image detection is handled by MediaPipe, a suite of libraries and tools provided by Google for the implementation of AI techniques in applications. We utilize their hand landmark detection model, which is able to detect and render the landmarks of a human hand from an image. This model is efficient enough to run on-device, eliminating the need for an expensive backend. The app is hosted on Cloudflare, which provides improved speed, uptime, and security while giving us access to a rich developer platform for edge computing and analytics.

## Challenges we ran into
The development of ToothRush was wrought with many conundrums. One such challenge was making the controls feel intuitive and reliable. Due to the inherently stochastic nature of AI and computer vision, we took great lengths to ensure that our movement system would be tolerant to inaccurate model detections.

## Accomplishments that we're proud of
We're proud of creating a finished product out of an idea we once thought was unfeasible. Not only that, but we managed to create a fully polished game with our own assets and frontend design! Finally, our original system for detecting the pitch and brushing rate of the player went through many iterations, and we're proud of how accurate and precise it turned out in the end.

## What we learned
The journey of ToothRush’s development taught us many lessons. We gained experience with the integration of machine learning libraries with web applications. We glimpsed the subtleties of the JavaScript Canvas API. We learnt of the power of vibe coding, along with its hidden toll in the form of endless refactoring. Most importantly of all, we realized that the real Hack the North was the friends we made along the way.

## What's next for ToothRush
- Streak system or other in-game incentives for you to consistently brush your teeth
- Better mobile support
- Improving toothbrush orientation recognition for both manual and electric toothbrushes
- More games and maps that teach you the proper technique for brushing

