from django.db import models
from django.contrib.auth.models import User

from versionutils import versioning

from pages.fields import WikiHTMLField


class SimpleWikiHTMLField(WikiHTMLField):
    allowed_elements = [
        'p', 'br', 'a', 'em', 'strong', 'u', 'img', 'h1', 'h2', 'h3',
        'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'pre', 'span', 'strike',
        'tt'
    ]


class Event(models.Model):
    title = models.CharField(max_length=250)
    time_start = models.DateTimeField()
    location = models.CharField(max_length=250)
    description = SimpleWikiHTMLField()
    
    class Meta:
        ordering = ['time_start']

    def __unicode__(self):
        return "%s - %s" % (self.title, self.time_start)

versioning.register(Event)


# For registration calls
import feeds
