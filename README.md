# Pubquiz
Pubquiz is a bot which can organize pubquizes in Discord. 
You can `create` a pubquiz and optionally give it a name, description and image.
A category with `#feed` and `#controls` will be created. In #controls, as the name already suggests, you can control the pubquiz.
Here you can `add`, `remove` and `edit` questions, start the quiz, allow people to spectate and more.

The following can (currently) be included in a question:
- The question itself
- A countdown
- An image

After you're done adding questions you can `open` the quiz and the bot will send a message in #feed and people can join. A private channel gets created for every joined user. 
The host can see everyone's answers while the participants only see their own.
Done with the pubquiz? You can `end` it.   
Want to do the same quiz again or share it with others? No problem!
You can start another pubquiz and `use` the UUID the bot DM'ed you when you created the previous one. You can even share this UUID with others!
Do you want to completely delete the data? Just use the `delete` command.

Planned features:
- Support > 48 participants
- Multiple choice
- (Automatic) question reviewing
- Importing questions from a spreadsheed
- Announce a pubquiz
