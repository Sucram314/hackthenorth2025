import webbrowser, os
path = os.getcwd()
webbrowser.open("http://localhost:8000", new = 2)
os.system("cd "+path+" && python -m http.server")