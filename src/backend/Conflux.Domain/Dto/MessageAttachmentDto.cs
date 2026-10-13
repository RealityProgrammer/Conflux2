using Conflux.Domain.Entities;
using Facet;
using System.ComponentModel.DataAnnotations;

namespace Conflux.Domain.Dto;

[Facet(typeof(MediaItem), Include = [], CopyDocs = false)]
public sealed partial record MessageAttachmentDto {
    [Required, MapFrom("Id")] public Guid Id { get; set; }
    [Required, MapFrom("FileName")] public string Name { get; set; }
    [Required, MapFrom("ContentType")] public string Type { get; set; }
}