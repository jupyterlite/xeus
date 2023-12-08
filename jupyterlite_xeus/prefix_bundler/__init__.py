from .noop_prefix_bundler import NoopPrefixBundler
from .empack_bundler import EmpackBundler

# register
prefix_bundler_registry = {
    "empack": EmpackBundler,    
    "default": NoopPrefixBundler # no-op / do nothing
}

def get_prefix_bundler(
        addon,
        prefix_bundler_name,
        kernel_name,
        **kwargs
    ):
                       
    if prefix_bundler_name is None:
        prefix_bundler_name = "default"
    bundler_cls =  prefix_bundler_registry[prefix_bundler_name] 
    return bundler_cls(addon, kernel_name, **kwargs)

