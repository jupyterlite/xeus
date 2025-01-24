extensions = [
    "jupyterlite_sphinx",
    "myst_parser",
    "sphinx_design",
]

myst_enable_extensions = [
    "linkify",
    "colon_fence",
]

master_doc = "index"
source_suffix = ".rst"

project = "jupyterlite-xeus"
copyright = "JupyterLite Team"
author = "JupyterLite Team"

exclude_patterns = []

html_theme = "pydata_sphinx_theme"

html_static_path = ['_static']

html_css_files = [
    'css/custom.css',
]

jupyterlite_dir = "."
jupyterlite_silence = False

html_theme_options = {
    "logo": {
        "image_light": "jupyterlite.svg",
        "image_dark": "jupyterlite.svg",
    }
}
