# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e5]: Labamu WMS
      - navigation [ref=e6]:
        - link "Dashboard" [ref=e9] [cursor=pointer]:
          - /url: /
        - generic [ref=e10]:
          - heading "System" [level=3] [ref=e11]
          - link "User Guide" [ref=e13] [cursor=pointer]:
            - /url: /user-guide
      - link "Sign Out" [ref=e15] [cursor=pointer]:
        - /url: /login
    - main [ref=e16]:
      - generic [ref=e18]:
        - heading "Sign in to your account" [level=2] [ref=e20]
        - generic [ref=e21]:
          - generic [ref=e22]:
            - generic [ref=e23]:
              - text: Email address
              - textbox "Email address" [ref=e24]
            - generic [ref=e25]:
              - text: Password
              - textbox "Password" [ref=e26]
          - button "Sign in" [ref=e28]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e34] [cursor=pointer]:
    - generic [ref=e37]:
      - text: Compiling
      - generic [ref=e38]:
        - generic [ref=e39]: .
        - generic [ref=e40]: .
        - generic [ref=e41]: .
  - alert [ref=e42]
```