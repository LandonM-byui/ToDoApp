from datetime import datetime
name = input("Please enter your name: ")
time = datetime.now()
print("Hello", name, "\b, it is currently", time.strftime("%I:%M %p"), "on", 
      time.strftime("%A, %B %d, %Y"))