#include "torproject/OnionAliasService.h"

#include "mozilla/ClearOnShutdown.h"
#include "mozilla/StaticPrefs_browser.h"
#include "nsUnicharUtils.h"

/**
 * Check if a hostname is a valid Onion v3 hostname.
 *
 * @param aHostname
 *        The hostname to verify. It is not a const reference because any
 *        uppercase character will be transformed to lowercase during the
 *        verification.
 * @return Tells whether the input string is an Onion v3 address
 */
static bool ValidateOnionV3(nsACString& aHostname) {
  constexpr nsACString::size_type v3Length = 56 + 6;
  if (aHostname.Length() != v3Length) {
    return false;
  }
  ToLowerCase(aHostname);
  if (!StringEndsWith(aHostname, ".onion"_ns)) {
    return false;
  }

  const char* cur = aHostname.BeginWriting();
  // We have already checked that it ends by ".onion"
  const char* end = aHostname.EndWriting() - 6;
  for (; cur < end; ++cur) {
    if (!(islower(*cur) || ('2' <= *cur && *cur <= '7'))) {
      return false;
    }
  }

  return true;
}

namespace torproject {

NS_IMPL_ISUPPORTS(OnionAliasService, IOnionAliasService)

static mozilla::StaticRefPtr<OnionAliasService> gOAService;

// static
already_AddRefed<IOnionAliasService> OnionAliasService::GetSingleton() {
  if (gOAService) {
    return do_AddRef(gOAService);
  }

  gOAService = new OnionAliasService();
  ClearOnShutdown(&gOAService);
  return do_AddRef(gOAService);
}

NS_IMETHODIMP
OnionAliasService::AddOnionAlias(const nsACString& aShortHostname,
                                 const nsACString& aLongHostname) {
  nsAutoCString shortHostname;
  ToLowerCase(aShortHostname, shortHostname);
  mozilla::UniquePtr<nsAutoCString> longHostname =
      mozilla::MakeUnique<nsAutoCString>(aLongHostname);
  if (!longHostname) {
    return NS_ERROR_OUT_OF_MEMORY;
  }
  if (!StringEndsWith(shortHostname, ".tor.onion"_ns) ||
      !ValidateOnionV3(*longHostname)) {
    return NS_ERROR_INVALID_ARG;
  }
  mozilla::AutoWriteLock lock(mLock);
  mOnionAliases.InsertOrUpdate(shortHostname, std::move(longHostname));
  return NS_OK;
}

NS_IMETHODIMP
OnionAliasService::GetOnionAlias(const nsACString& aShortHostname,
                                 nsACString& aLongHostname) {
  aLongHostname = aShortHostname;
  if (mozilla::StaticPrefs::browser_urlbar_onionRewrites_enabled() &&
      StringEndsWith(aShortHostname, ".tor.onion"_ns)) {
    nsAutoCString* alias = nullptr;
    // We want to keep the string stored in the map alive at least until we
    // finish to copy it to the output parameter.
    mozilla::AutoReadLock lock(mLock);
    if (mOnionAliases.Get(aShortHostname, &alias)) {
      // We take for granted aliases have already been validated
      aLongHostname.Assign(*alias);
    }
  }
  return NS_OK;
}

NS_IMETHODIMP
OnionAliasService::ClearOnionAliases() {
  mozilla::AutoWriteLock lock(mLock);
  mOnionAliases.Clear();
  return NS_OK;
}

}  // namespace torproject
