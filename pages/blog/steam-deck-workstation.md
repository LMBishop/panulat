---
title: Steam Deck Workstation
date: !!timestamp '2023-08-03'
---

I have this dilemma. Do I: a) spend ages tearing down my PC so I can lug it onto
a train to take to my uni house and rebuild it again there, where it could
get stolen, or b) forego the PC and simply not have a desktop workstation /
gaming rig instead? 

Earlier this year, genius me came up with a third option: 
convert my [Steam Deck](https://www.steamdeck.com/en/) 
into a desktop PC instead! 

## Why

While I was back at home over Christmas, I had played and really enjoyed 
Overwatch 2, and wanted to keep playing once I went 
back to university. Unfortunately for me, my laptop is both not powerful enough, 
and not capable of outputting to external displays for Complicated reasons.

The obvious solution would be to simply bring my PC, however I had a criminally 
small desk at the time (which means I have absolutely nowhere to put it, not 
even the floor), and it would take too much effort to bring back on the train
with everything else I brought home.

I remembered I had recently bought a Steam Deck, which had been sitting in
my bag collecting dust, and figured I could try and turn that into my
desktop PC. After all, it *is* a device designed to be portable.

## Testing Valve's claim

Valve champions the fact that their Steam Deck can be used as a normal PC.
They have Windows drivers, and even sell a 
[dock](https://store.steampowered.com/steamdeckdock), which I bought solely for 
this purpose.

Unfortunately Overwatch breaks when using Proton, which meant I had to install 
Windows. This involves the tedious task of partitioning the Steam Deck.
Additionally, my scope had expanded to wanting to install a Linux environment 
as well, so I could use it instead of my aforementioned dodgy laptop to work on 
projects.

<figure>
  <img src="/images/steam-deck-gparted.jpg" width=300>
  <figcaption>
    GParted running on the Deck. It was as annoying to use as it looks.
  </figcaption>
</figure>

SteamOS is based off Arch, so in theory I could have just installed all
my packages on there and replaced KDE with by preferred sway. However, the root 
partition is mounted as read only by default, and any changes made to it get 
completely wiped whenever SteamOS is updated. No go.

Instead, I repartitioned the internal disk and decided to do a triple-boot 
setup: SteamOS (so I can still use it as it was intended), Windows (solely to 
play Overwatch 2), and Arch (because I use Arch btw).

<figure>
  <img src="/images/steam-deck-partitions.jpg">
  <figcaption>
    Internal drive partition table
  </figcaption>
</figure>

As the Deck is only 512gb in size, I decided to go with booting Arch
off a microSD card, which would be left inserted in the Deck's built-in microSD 
slot.

## The experience

For productivity, it was great. I managed to work on some projects using it,
got some university work done, and procrastinated a lot.

<figure>
  <img src="/images/steam-deck-arch.jpg">
  <figcaption>My university setup</figcaption>
</figure>

For gaming, it was not so great. Turns out running games on a 1080p
monitor is quite a bit more demanding than 720p. Overwatch 2 experienced quite
frequent frame drops, and Counter-Strike was even worse somehow. Not to mention
I was also on Wi-Fi, which means I'm rubber banding all over the joint anyway.

There were some other issues too. The Steam Deck is nice and fast when a single
game open is in 
[gamescope](https://github.com/ValveSoftware/gamescope). 
However, when trying to use it as a general desktop PC,
its limitations start becoming much more obvious. Simple things like updating
the system with `pacman` left the system effectively unresponsive until it 
completed. Loading a heavy program like IntelliJ also froze up the system until 
it finished. I don't know if this is an IO bottleneck (this partition is booted 
off a microSD card after all) but I did observe the same 100% CPU utilisation 
when doing simple tasks in Windows too.

## Conclusion

Maybe just plug a laptop into the monitor next time. 
