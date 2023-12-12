from .prefix_bundler_base import PrefixBundlerBase

# do nothing at all
class NoopPrefixBundler(PrefixBundlerBase):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def build(self):
       yield None